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

interface PendingOfflineController {
	controller: VatsimControllerRecord;
	occurredAtMs: number;
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
	private readonly controllerChangeWindowMs: number;
	private timer: ReturnType<typeof setInterval> | null = null;
	private pollInFlight = false;
	private currentControllers = new Map<number, VatsimControllerRecord>();
	private pendingOfflineControllers = new Map<string, PendingOfflineController>();
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
		this.controllerChangeWindowMs = Math.max(this.pollIntervalMs * 2, 30_000);
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

	public async listRecentWatchlistEvents(watchRules: WatchRule[], limit = 12): Promise<ControllerEvent[]> {
		const activeWatchRules = watchRules.filter((watchRule) => watchRule.isActive);
		if (activeWatchRules.length === 0) {
			return [];
		}

		const matchingEvents: ControllerEvent[] = [];
		const pageSize = Math.min(Math.max(limit * 4, 24), 100);
		const maxScan = 500;

		for (let offset = 0; offset < maxScan && matchingEvents.length < limit; offset += pageSize) {
			const recentEvents = await this.controllerEventStore.listRecent(pageSize, offset);
			if (recentEvents.length === 0) {
				break;
			}

			for (const event of recentEvents) {
				const matchedRules = await this.getMatchedRulesForCallsign(activeWatchRules, event.callsign);
				if (matchedRules.length === 0) {
					continue;
				}

				matchingEvents.push(event);
				if (matchingEvents.length >= limit) {
					break;
				}
			}

			if (recentEvents.length < pageSize) {
				break;
			}
		}

		return matchingEvents;
	}

	public async getMonitorSnapshot(watchRules: WatchRule[]): Promise<MonitorSnapshot> {
		const activeWatchRules = watchRules.filter((watchRule) => watchRule.isActive);
		const watchedControllers: MonitorSnapshot["watchedControllers"] = [];
		const otherControllers: MonitorController[] = [];

		for (const controller of [...this.currentControllers.values()].sort((left, right) =>
			left.callsign.localeCompare(right.callsign)
		)) {
			const matchedRules = await this.getMatchedRulesForCallsign(activeWatchRules, controller.callsign);

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

	private async getMatchedRulesForCallsign(
		watchRules: WatchRule[],
		callsign: string
	): Promise<MonitorSnapshot["watchedControllers"][number]["matchedRules"]> {
		const matchedRules: MonitorSnapshot["watchedControllers"][number]["matchedRules"] = [];
		const normalizedCallsign = callsign.toUpperCase();
		const relatedCallsigns = new Set<string>([normalizedCallsign]);

		for (const watchRule of watchRules) {
			if (patternMatches(watchRule.pattern, callsign)) {
				matchedRules.push({
					watchRuleId: watchRule.id,
					pattern: watchRule.pattern,
					matchType: "direct"
				});
				continue;
			}

			if (!watchRule.topdown) {
				continue;
			}

			if (relatedCallsigns.size === 1) {
				for (const relatedCallsign of await this.topdownResolver.resolveCoveredCallsigns(callsign)) {
					relatedCallsigns.add(relatedCallsign.toUpperCase());
				}
			}

			for (const relatedCallsign of relatedCallsigns) {
				if (relatedCallsign === normalizedCallsign) {
					continue;
				}

				if (patternMatches(watchRule.pattern, relatedCallsign)) {
					matchedRules.push({
						watchRuleId: watchRule.id,
						pattern: watchRule.pattern,
						matchType: "topdown"
					});
					break;
				}
			}
		}

		return matchedRules;
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
					changedEvents: 0,
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
				changedEvents: 0,
				newEvents: 0,
				offlineEvents: 0,
				sentNotifications: 0,
				skippedNotifications: 0
			};

			const ignoredControllerIds = await this.ignoredControllerStore.listIgnoredControllerIds();
			const routedTargets = await this.notificationRoutingStore.listActiveDiscordTargets();

			for (const controller of offlineControllers) {
				this.pendingOfflineControllers.set(controller.callsign.toUpperCase(), {
					controller,
					occurredAtMs: occurredAt.getTime()
				});
			}

			for (const controller of newControllers) {
				const previousController = this.takePendingOfflineController(controller, occurredAt);
				const type = previousController ? "controller_change" : "controller_online";
				if (type === "controller_change") {
					cycleStats.changedEvents += 1;
				} else {
					cycleStats.newEvents += 1;
				}

				const outcome = await this.handleControllerEvent(type, controller, occurredAt, routedTargets, ignoredControllerIds, previousController);
				cycleStats.sentNotifications += outcome.sentNotifications;
				cycleStats.skippedNotifications += outcome.skippedNotifications;
			}

			for (const pendingOfflineController of this.collectExpiredOfflineControllers(occurredAt)) {
				cycleStats.offlineEvents += 1;
				const outcome = await this.handleControllerEvent(
					"controller_offline",
					pendingOfflineController,
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
		ignoredControllerIds: Set<number>,
		previousController?: VatsimControllerRecord
	): Promise<{ sentNotifications: number; skippedNotifications: number }> {
		const relatedCallsigns = new Set<string>([controller.callsign.toUpperCase()]);
		for (const coveredCallsign of await this.topdownResolver.resolveCoveredCallsigns(controller.callsign)) {
			relatedCallsigns.add(coveredCallsign.toUpperCase());
		}

		const matchingTargets = new Map<string, (typeof routedTargets)[number]>();
		for (const target of routedTargets) {
			const destinationKey = target.destination.trim().toLowerCase();
			if (patternMatches(target.pattern, controller.callsign)) {
				matchingTargets.set(destinationKey, target);
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
					matchingTargets.set(destinationKey, target);
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
				name: controller.name,
				previousController: previousController
					? {
							cid: previousController.cid,
							callsign: previousController.callsign,
							frequency: previousController.frequency,
							name: previousController.name
						}
					: null
			}),
			dedupeKey: previousController
				? `${type}:${previousController.cid}:${controller.cid}:${controller.callsign}:${controller.frequency}:${occurredAt.toISOString()}`
				: `${type}:${controller.cid}:${controller.callsign}:${controller.frequency}:${occurredAt.toISOString()}`,
			occurredAt
		});

		for (const target of matchingTargets.values()) {
			const template =
				type === "controller_online"
					? target.config.controllerOnline
					: type === "controller_offline"
						? target.config.controllerOffline
						: target.config.controllerChange;
			if (!template.enabled) {
				skippedNotifications += 1;
				continue;
			}

			const delivery = await this.notificationDeliveryStore.createPending(event.id, target.channelId);

			try {
				await this.discordNotifier.sendWebhook(
					target.destination,
					this.buildDiscordPayload(type, controller, target.config, previousController, occurredAt)
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
		config: DiscordNotificationChannelConfig,
		previousController: VatsimControllerRecord | undefined,
		occurredAt: Date
	): DiscordWebhookPayload {
		const template =
			type === "controller_online"
				? config.controllerOnline
				: type === "controller_offline"
					? config.controllerOffline
					: config.controllerChange;
		const variables = {
			callsign: controller.callsign,
			frequency: controller.frequency,
			controllerName: controller.name,
			controllerCid: String(controller.cid),
			previousControllerName: previousController?.name ?? "Unknown controller",
			previousControllerCid: previousController ? String(previousController.cid) : "Unknown CID",
			previousFrequency: previousController?.frequency ?? "Unknown frequency",
			eventType: type,
			eventLabel:
				type === "controller_online" ? "online" : type === "controller_offline" ? "offline" : "changed",
			statusLabel:
				type === "controller_online"
					? "came online"
					: type === "controller_offline"
						? "went offline"
						: "changed controllers"
		};

		const renderTemplate = (template: string | null): string | null => {
			if (!template || template.trim().length === 0) {
				return null;
			}

			return template.replace(/\{\{(\w+)\}\}/g, (match, key: keyof typeof variables) => variables[key] ?? match);
		};

		const color = template.color
			? colorToDecimal(template.color)
			: type === "controller_online"
				? 0x1c7f58
				: type === "controller_offline"
					? 0xaa4d24
					: 0x0e7c86;

		return {
			content: renderTemplate(template.contentTemplate),
			embeds: [
				{
					title: renderTemplate(template.titleTemplate) ?? undefined,
					description: renderTemplate(template.descriptionTemplate) ?? undefined,
					color,
					timestamp: occurredAt.toISOString()
				}
			]
		};
	}

	private takePendingOfflineController(
		controller: VatsimControllerRecord,
		occurredAt: Date
	): VatsimControllerRecord | undefined {
		const key = controller.callsign.toUpperCase();
		const pending = this.pendingOfflineControllers.get(key);
		if (!pending) {
			return undefined;
		}

		if (
			pending.controller.cid === controller.cid
		) {
			this.pendingOfflineControllers.delete(key);
			return undefined;
		}

		if (occurredAt.getTime() - pending.occurredAtMs > this.controllerChangeWindowMs) {
			return undefined;
		}

		this.pendingOfflineControllers.delete(key);
		return pending.controller;
	}

	private collectExpiredOfflineControllers(occurredAt: Date): VatsimControllerRecord[] {
		const expired: VatsimControllerRecord[] = [];
		for (const [callsign, pending] of this.pendingOfflineControllers.entries()) {
			if (occurredAt.getTime() - pending.occurredAtMs < this.controllerChangeWindowMs) {
				continue;
			}

			expired.push(pending.controller);
			this.pendingOfflineControllers.delete(callsign);
		}

		return expired;
	}
}
