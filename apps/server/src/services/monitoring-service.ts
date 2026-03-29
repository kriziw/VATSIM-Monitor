import type {
	ControllerEvent,
	ControllerEventType,
	MonitorStatus,
	MonitoringCycleStats
} from "@vatsim-monitor/domain";
import type {
	ControllerEventStore,
	IgnoredControllerStore,
	NotificationDeliveryStore,
	NotificationRoutingStore
} from "@vatsim-monitor/data";
import type {
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

	private async pollOnce(): Promise<void> {
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
		}
	}

	private async handleControllerEvent(
		type: ControllerEventType,
		controller: VatsimControllerRecord,
		occurredAt: Date,
		routedTargets: Awaited<ReturnType<NotificationRoutingStore["listActiveDiscordTargets"]>>,
		ignoredControllerIds: Set<number>
	): Promise<{ sentNotifications: number; skippedNotifications: number }> {
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

		for (const target of matchingTargets.values()) {
			const delivery = await this.notificationDeliveryStore.createPending(event.id, target.channelId);

			if (ignoredControllerIds.has(controller.cid)) {
				await this.notificationDeliveryStore.markSkipped(
					delivery.id,
					"Controller is marked as ignored for tracking."
				);
				skippedNotifications += 1;
				continue;
			}

			try {
				await this.discordNotifier.sendWebhook(
					target.destination,
					type === "controller_online" ? "Controller online" : "Controller offline",
					this.buildDiscordBody(type, controller)
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

	private buildDiscordBody(type: ControllerEventType, controller: VatsimControllerRecord): string {
		if (type === "controller_online") {
			return `Controller **${controller.name}** (${controller.cid}) logged on as **${controller.callsign}** on **${controller.frequency}**.`;
		}

		return `Controller **${controller.name}** (${controller.cid}) logged off from **${controller.callsign}**.`;
	}
}
