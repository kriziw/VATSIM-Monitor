import type {
	ControllerEvent,
	ControllerEventType,
	DiscordNotificationChannelConfig,
	MonitorController,
	MonitorSnapshot,
	MonitorStatus,
	MonitoringCycleStats,
	WatchRule
} from "@vatsim-monitor/domain";
import type {
	ControllerEventStore,
	IgnoredControllerStore,
	NotificationDeliveryStore,
	NotificationRoutingStore
} from "@vatsim-monitor/data";
import type {
	DiscordWebhookPayload,
	DiscordNotifier,
	TopdownResolver,
	VatsimControllerRecord,
	VatsimDataClient
} from "@vatsim-monitor/integrations";

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternMatches(pattern: string, callsign: string): boolean {
	const regex = new RegExp(`^${escapeRegex(pattern).replace(/%/g, ".*")}$`, "i");
	return regex.test(callsign);
}

function colorToDecimal(color: string): number {
	return Number.parseInt(color.replace(/^#/, ""), 16);
}

export interface MonitoringServiceOptions {
	pollIntervalMs: number;
	vatsimClient: VatsimDataClient;
	topdownResolver: TopdownResolver;
	discordNotifier: DiscordNotifier;
	ignoredControllerStore: IgnoredControllerStore;
	notificationRoutingStore: NotificationRoutingStore;
	controllerEventStore: ControllerEventStore;
	notificationDeliveryStore: NotificationDeliveryStore;
	topdownProviderState?: "active" | "pending" | "stopped";
}

export class MonitoringService {
	private readonly pollIntervalMs: number;
	private readonly vatsimClient: VatsimDataClient;
	private readonly topdownResolver: TopdownResolver;
	private readonly discordNotifier: DiscordNotifier;
	private readonly ignoredControllerStore: IgnoredControllerStore;
	private readonly notificationRoutingStore: NotificationRoutingStore;
	private readonly controllerEventStore: ControllerEventStore;
	private readonly notificationDeliveryStore: NotificationDeliveryStore;
	private readonly topdownProviderState: "active" | "pending" | "stopped";
	private timer: ReturnType<typeof setInterval> | null = null;
	private pollInFlight = false;
	private currentControllers = new Map<number, VatsimControllerRecord>();
	private lastPollAt: string | null = null;
	private lastSuccessAt: string | null = null;
	private lastError: string | null = null;
	private lastCycle: MonitoringCycleStats | null = null;
	private state: "planned" | "running" | "stopped" = "planned";

	constructor(options: MonitoringServiceOptions) {
		this.pollIntervalMs = options.pollIntervalMs;
		this.vatsimClient = options.vatsimClient;
		this.topdownResolver = options.topdownResolver;
		this.discordNotifier = options.discordNotifier;
		this.ignoredControllerStore = options.ignoredControllerStore;
		this.notificationRoutingStore = options.notificationRoutingStore;
		this.controllerEventStore = options.controllerEventStore;
		this.notificationDeliveryStore = options.notificationDeliveryStore;
		this.topdownProviderState = options.topdownProviderState ?? "pending";
	}

	public start(): void {
		if (this.timer) {
			return;
		}

		this.state = "running";
		void this.pollOnce();
		this.timer = setInterval(() => {
			void this.pollOnce();
		}, this.pollIntervalMs);
	}

	public stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}

		this.state = "stopped";
	}

	public getStatus(): MonitorStatus {
		return {
			state: this.state,
			pollIntervalMs: this.pollIntervalMs,
			lastPollAt: this.lastPollAt,
			lastSuccessAt: this.lastSuccessAt,
			lastError: this.lastError,
			currentOnlineCount: this.currentControllers.size,
			lastCycle: this.lastCycle,
			providers: {
				vatsim: this.state === "running" ? "active" : "pending",
				ukTopdown: this.topdownProviderState
			}
		};
	}

	public async listRecentEvents(limit = 20): Promise<ControllerEvent[]> {
		return this.controllerEventStore.listRecent(limit);
	}

	public async getMonitorSnapshot(watchRules: WatchRule[]): Promise<MonitorSnapshot> {
		const activeWatchRules = watchRules.filter((watchRule) => watchRule.isActive);
		const watchedControllers: MonitorSnapshot["watchedControllers"] = [];
		const otherControllers: MonitorController[] = [];

		for (const controller of [...this.currentControllers.values()].sort((left, right) =>
			left.callsign.localeCompare(right.callsign)
		)) {
			const matchedRules = [];
			const relatedCallsigns = new Set<string>([controller.callsign.toUpperCase()]);

			for (const watchRule of activeWatchRules) {
				if (patternMatches(watchRule.pattern, controller.callsign)) {
					matchedRules.push({
						watchRuleId: watchRule.id,
						pattern: watchRule.pattern,
						matchType: "direct" as const
					});
					continue;
				}

				if (!watchRule.topdown) {
					continue;
				}

				if (relatedCallsigns.size === 1) {
					for (const relatedCallsign of await this.topdownResolver.resolveCoveredCallsigns(controller.callsign)) {
						relatedCallsigns.add(relatedCallsign.toUpperCase());
					}
				}

				for (const relatedCallsign of relatedCallsigns) {
					if (relatedCallsign === controller.callsign.toUpperCase()) {
						continue;
					}

					if (patternMatches(watchRule.pattern, relatedCallsign)) {
						matchedRules.push({
							watchRuleId: watchRule.id,
							pattern: watchRule.pattern,
							matchType: "topdown" as const
						});
						break;
					}
				}
			}

			const monitorController: MonitorController = {
				cid: controller.cid,
				callsign: controller.callsign,
				frequency: controller.frequency,
				name: controller.name
			};

			if (matchedRules.length > 0) {
				watchedControllers.push({
					...monitorController,
					matchedRules
				});
			} else {
				otherControllers.push(monitorController);
			}
		}

		watchedControllers.sort((left, right) => {
			const leftDirect = left.matchedRules.some((rule) => rule.matchType === "direct") ? 0 : 1;
			const rightDirect = right.matchedRules.some((rule) => rule.matchType === "direct") ? 0 : 1;
			if (leftDirect !== rightDirect) {
				return leftDirect - rightDirect;
			}

			return left.callsign.localeCompare(right.callsign);
		});

		return {
			watchedControllers,
			otherControllers
		};
	}

	private async pollOnce(): Promise<void> {
		if (this.pollInFlight) {
			return;
		}

		this.pollInFlight = true;
		this.lastPollAt = new Date().toISOString();
		const occurredAt = new Date();

		try {
			const controllers = await this.vatsimClient.fetchControllers();
			const nextControllers = new Map<number, VatsimControllerRecord>(
				controllers.map((controller: VatsimControllerRecord) => [controller.cid, controller])
			);

			if (this.currentControllers.size === 0) {
				this.currentControllers = nextControllers;
				this.lastSuccessAt = occurredAt.toISOString();
				this.lastError = null;
				this.lastCycle = {
					fetchedControllers: nextControllers.size,
					newEvents: 0,
					offlineEvents: 0,
					sentNotifications: 0,
					skippedNotifications: 0
				};
				return;
			}

			const newControllers = [...nextControllers.values()].filter(
				(controller) => !this.currentControllers.has(controller.cid)
			);
			const offlineControllers = [...this.currentControllers.values()].filter(
				(controller) => !nextControllers.has(controller.cid)
			);

			const cycleStats: MonitoringCycleStats = {
				fetchedControllers: nextControllers.size,
				newEvents: 0,
				offlineEvents: 0,
				sentNotifications: 0,
				skippedNotifications: 0
			};

			const ignoredControllerIds = await this.ignoredControllerStore.listIgnoredControllerIds();
			const routedTargets = await this.notificationRoutingStore.listActiveDiscordTargets();

			for (const controller of newControllers) {
				cycleStats.newEvents += 1;
				const outcome = await this.handleControllerEvent(
					"controller_online",
					controller,
					occurredAt,
					routedTargets,
					ignoredControllerIds
				);
				cycleStats.sentNotifications += outcome.sentNotifications;
				cycleStats.skippedNotifications += outcome.skippedNotifications;
			}

			for (const controller of offlineControllers) {
				cycleStats.offlineEvents += 1;
				const outcome = await this.handleControllerEvent(
					"controller_offline",
					controller,
					occurredAt,
					routedTargets,
					ignoredControllerIds
				);
				cycleStats.sentNotifications += outcome.sentNotifications;
				cycleStats.skippedNotifications += outcome.skippedNotifications;
			}

			this.currentControllers = nextControllers;
			this.lastSuccessAt = occurredAt.toISOString();
			this.lastError = null;
			this.lastCycle = cycleStats;
		} catch (error: any) {
			this.lastError = error?.message || "Unexpected monitoring failure.";
		} finally {
			this.pollInFlight = false;
		}
	}

	private async handleControllerEvent(
		type: ControllerEventType,
		controller: VatsimControllerRecord,
		occurredAt: Date,
		routedTargets: Awaited<ReturnType<NotificationRoutingStore["listActiveDiscordTargets"]>>,
		ignoredControllerIds: Set<number>
	): Promise<{ sentNotifications: number; skippedNotifications: number }> {
		const relatedCallsigns = new Set<string>([controller.callsign]);
		for (const coveredCallsign of await this.topdownResolver.resolveCoveredCallsigns(controller.callsign)) {
			relatedCallsigns.add(coveredCallsign.toUpperCase());
		}

		const matchingTargets = new Map<string, (typeof routedTargets)[number]>();
		for (const target of routedTargets) {
			if (patternMatches(target.pattern, controller.callsign)) {
				matchingTargets.set(target.channelId, target);
				continue;
			}

			if (!target.topdown) {
				continue;
			}

			for (const relatedCallsign of relatedCallsigns) {
				if (relatedCallsign === controller.callsign) {
					continue;
				}

				if (patternMatches(target.pattern, relatedCallsign)) {
					matchingTargets.set(target.channelId, target);
					break;
				}
			}
		}

		let sentNotifications = 0;
		let skippedNotifications = 0;

		if (ignoredControllerIds.has(controller.cid)) {
			return {
				sentNotifications: 0,
				skippedNotifications: matchingTargets.size
			};
		}

		const event = await this.controllerEventStore.create({
			type,
			source: "vatsim",
			controllerCid: controller.cid,
			callsign: controller.callsign,
			frequency: controller.frequency,
			payloadJson: JSON.stringify({
				name: controller.name
			}),
			dedupeKey: `${type}:${controller.cid}:${controller.callsign}:${controller.frequency}:${occurredAt.toISOString()}`,
			occurredAt
		});

		for (const target of matchingTargets.values()) {
			const delivery = await this.notificationDeliveryStore.createPending(event.id, target.channelId);

			try {
				await this.discordNotifier.sendWebhook(
					target.destination,
					this.buildDiscordPayload(type, controller, target.config)
				);
				await this.notificationDeliveryStore.markSent(delivery.id);
				sentNotifications += 1;
			} catch (error: any) {
				await this.notificationDeliveryStore.markFailed(
					delivery.id,
					error?.message || "Discord delivery failed."
				);
				skippedNotifications += 1;
			}
		}

		return { sentNotifications, skippedNotifications };
	}

	private buildDiscordPayload(
		type: ControllerEventType,
		controller: VatsimControllerRecord,
		config: DiscordNotificationChannelConfig
	): DiscordWebhookPayload {
		const variables = {
			callsign: controller.callsign,
			frequency: controller.frequency,
			controllerName: controller.name,
			controllerCid: String(controller.cid),
			eventType: type,
			eventLabel: type === "controller_online" ? "online" : "offline",
			statusLabel: type === "controller_online" ? "came online" : "went offline"
		};

		const renderTemplate = (template: string | null): string | null => {
			if (!template || template.trim().length === 0) {
				return null;
			}

			return template.replace(/\{\{(\w+)\}\}/g, (match, key: keyof typeof variables) => variables[key] ?? match);
		};

		const color = config.color
			? colorToDecimal(config.color)
			: type === "controller_online"
				? 0x1c7f58
				: 0xaa4d24;

		return {
			content: renderTemplate(config.contentTemplate),
			embeds: [
				{
					title: renderTemplate(config.titleTemplate) ?? undefined,
					description: renderTemplate(config.descriptionTemplate) ?? undefined,
					color,
					timestamp: new Date().toISOString()
				}
			]
		};
	}
}
