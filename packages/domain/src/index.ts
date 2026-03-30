export type UserRole = "admin" | "user";
export type LinkedAccountProvider = "local" | "vatsim";
export type NotificationChannelType = "discord_webhook" | "web_push";
export type ControllerEventType = "controller_offline" | "controller_online";
export type MonitorProviderState = "active" | "pending" | "stopped";

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
