export type UserRole = "admin" | "user";
export type LinkedAccountProvider = "local" | "vatsim";
export type NotificationChannelType = "discord_webhook" | "web_push";
export type ControllerEventType = "controller_change" | "controller_offline" | "controller_online";
export type MonitorProviderState = "active" | "pending" | "stopped";
export type DiscordNotificationTemplateType = "controllerChange" | "controllerOffline" | "controllerOnline";

export interface DiscordNotificationTemplate {
	titleTemplate: string;
	descriptionTemplate: string;
	contentTemplate: string | null;
	color: string | null;
}

export interface DiscordNotificationChannelConfig {
	controllerOnline: DiscordNotificationTemplate;
	controllerOffline: DiscordNotificationTemplate;
	controllerChange: DiscordNotificationTemplate;
}

export const DISCORD_TEMPLATE_VARIABLES = [
	"{{callsign}}",
	"{{frequency}}",
	"{{controllerName}}",
	"{{controllerCid}}",
	"{{previousControllerName}}",
	"{{previousControllerCid}}",
	"{{previousFrequency}}",
	"{{eventType}}",
	"{{eventLabel}}",
	"{{statusLabel}}"
] as const;

export function getDefaultDiscordNotificationTemplate(
	type: DiscordNotificationTemplateType
): DiscordNotificationTemplate {
	if (type === "controllerOnline") {
		return {
			titleTemplate: "Controller online: {{callsign}}",
			descriptionTemplate:
				"**{{controllerName}}** ({{controllerCid}}) came online on **{{callsign}}** at **{{frequency}}**.",
			contentTemplate: null,
			color: "#1C7F58"
		};
	}

	if (type === "controllerOffline") {
		return {
			titleTemplate: "Controller offline: {{callsign}}",
			descriptionTemplate:
				"**{{controllerName}}** ({{controllerCid}}) went offline from **{{callsign}}**.",
			contentTemplate: null,
			color: "#AA4D24"
		};
	}

	return {
		titleTemplate: "Controller change: {{callsign}}",
		descriptionTemplate:
			"**{{previousControllerName}}** ({{previousControllerCid}}) was replaced by **{{controllerName}}** ({{controllerCid}}) on **{{callsign}}**.",
		contentTemplate: null,
		color: "#0E7C86"
	};
}

function coerceDiscordNotificationTemplate(
	raw: unknown,
	type: DiscordNotificationTemplateType
): DiscordNotificationTemplate {
	const defaults = getDefaultDiscordNotificationTemplate(type);
	const template = raw && typeof raw === "object" ? (raw as Partial<DiscordNotificationTemplate>) : {};

	return {
		titleTemplate:
			typeof template.titleTemplate === "string" && template.titleTemplate.trim().length > 0
				? template.titleTemplate
				: defaults.titleTemplate,
		descriptionTemplate:
			typeof template.descriptionTemplate === "string" && template.descriptionTemplate.trim().length > 0
				? template.descriptionTemplate
				: defaults.descriptionTemplate,
		contentTemplate:
			typeof template.contentTemplate === "string" && template.contentTemplate.trim().length > 0
				? template.contentTemplate
				: null,
		color:
			typeof template.color === "string" && template.color.trim().length > 0
				? template.color.toUpperCase()
				: defaults.color
	};
}

export function coerceDiscordNotificationConfig(raw: unknown): DiscordNotificationChannelConfig {
	const parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
	const isLegacy =
		typeof parsed.titleTemplate === "string" ||
		typeof parsed.descriptionTemplate === "string" ||
		typeof parsed.contentTemplate === "string" ||
		typeof parsed.color === "string";

	if (isLegacy) {
		return {
			controllerOnline: coerceDiscordNotificationTemplate(parsed, "controllerOnline"),
			controllerOffline: coerceDiscordNotificationTemplate(parsed, "controllerOffline"),
			controllerChange: coerceDiscordNotificationTemplate(parsed, "controllerChange")
		};
	}

	return {
		controllerOnline: coerceDiscordNotificationTemplate(parsed.controllerOnline, "controllerOnline"),
		controllerOffline: coerceDiscordNotificationTemplate(parsed.controllerOffline, "controllerOffline"),
		controllerChange: coerceDiscordNotificationTemplate(parsed.controllerChange, "controllerChange")
	};
}

export function getDefaultDiscordNotificationConfig(): DiscordNotificationChannelConfig {
	return {
		controllerOnline: getDefaultDiscordNotificationTemplate("controllerOnline"),
		controllerOffline: getDefaultDiscordNotificationTemplate("controllerOffline"),
		controllerChange: getDefaultDiscordNotificationTemplate("controllerChange")
	};
}

export interface User {
	id: string;
	username: string;
	email: string | null;
	role: UserRole;
	createdAt: string;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: string;
}

export interface AuthenticatedSession {
	session: Session;
	user: User;
}

export interface LinkedAccount {
	id: string;
	userId: string;
	provider: LinkedAccountProvider;
	providerAccountId: string;
	displayName: string | null;
}

export interface WatchRule {
	id: string;
	userId: string;
	pattern: string;
	topdown: boolean;
	isActive: boolean;
	createdAt: string;
}

export interface NotificationChannel {
	id: string;
	userId: string;
	type: NotificationChannelType;
	displayName: string | null;
	destination: string;
	destinationMasked: string;
	config: DiscordNotificationChannelConfig | null;
	isActive: boolean;
	createdAt: string;
}

export interface ControllerEvent {
	id: string;
	type: ControllerEventType;
	controllerCid: number;
	callsign: string;
	frequency: string;
	source: string;
	occurredAt: string;
	createdAt: string;
}

export interface NotificationDelivery {
	id: string;
	eventId: string;
	channelId: string;
	status: "failed" | "pending" | "sent" | "skipped";
	errorText: string | null;
	deliveredAt: string | null;
	createdAt: string;
}

export interface MonitoringCycleStats {
	fetchedControllers: number;
	changedEvents: number;
	newEvents: number;
	offlineEvents: number;
	sentNotifications: number;
	skippedNotifications: number;
}

export interface MonitorStatus {
	state: "planned" | "running" | "stopped";
	pollIntervalMs: number;
	lastPollAt: string | null;
	lastSuccessAt: string | null;
	lastError: string | null;
	currentOnlineCount: number;
	lastCycle: MonitoringCycleStats | null;
	providers: {
		vatsim: MonitorProviderState;
		ukTopdown: MonitorProviderState;
	};
}

export interface MonitorController {
	cid: number;
	callsign: string;
	frequency: string;
	name: string;
}

export interface MonitorRuleMatch {
	watchRuleId: string;
	pattern: string;
	matchType: "direct" | "topdown";
}

export interface WatchedMonitorController extends MonitorController {
	matchedRules: MonitorRuleMatch[];
}

export interface MonitorSnapshot {
	watchedControllers: WatchedMonitorController[];
	otherControllers: MonitorController[];
}
