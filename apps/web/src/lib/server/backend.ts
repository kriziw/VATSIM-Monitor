import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import type {
	AuthenticatedSession,
	ControllerEvent,
	DiscordNotificationChannelConfig,
	MonitorSnapshot,
	MonitorStatus,
	NotificationChannel,
	WatchRule
} from "@vatsim-monitor/domain";

export interface AuthResponse {
	user: AuthenticatedSession["user"];
	session: AuthenticatedSession["session"];
}

export interface DashboardResponse {
	watchRules: WatchRule[];
	notificationChannels: NotificationChannel[];
}

function getApiBaseUrl(): string {
	return env.PRIVATE_API_BASE_URL || "http://localhost:8080";
}

export async function postAuthRequest(
	path: string,
	body: Record<string, string | null>
): Promise<AuthResponse> {
	const response = await fetch(`${getApiBaseUrl()}${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({ message: "Backend request failed." }));
		throw error(response.status, payload.message || "Backend request failed.");
	}

	return response.json();
}

export async function fetchCurrentSession(sessionId: string): Promise<AuthenticatedSession | null> {
	if (!sessionId) {
		return null;
	}

	let response: Response;

	try {
		response = await fetch(`${getApiBaseUrl()}/api/v1/auth/session`, {
			headers: {
				"x-session-id": sessionId
			}
		});
	} catch {
		throw error(503, "Authentication service is unavailable.");
	}

	if (response.status === 401) {
		return null;
	}

	if (!response.ok) {
		if (response.status >= 500) {
			throw error(503, "Authentication service is unavailable.");
		}

		throw error(response.status, "Failed to load the current session.");
	}

	return response.json();
}

async function requestWithSession(
	sessionId: string,
	path: string,
	options?: {
		method?: "DELETE" | "GET" | "PATCH" | "POST";
		body?: unknown;
	}
) {
	const response = await fetch(`${getApiBaseUrl()}${path}`, {
		method: options?.method || "GET",
		headers: {
			"x-session-id": sessionId,
			"Content-Type": "application/json"
		},
		body: options?.body ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => ({ message: "Backend request failed." }));
		throw error(response.status, payload.message || "Backend request failed.");
	}

	if (response.status === 204) {
		return null;
	}

	return response.json();
}

export async function fetchDashboardData(sessionId: string): Promise<DashboardResponse> {
	return requestWithSession(sessionId, "/api/v1/dashboard") as Promise<DashboardResponse>;
}

export async function fetchMonitorSnapshot(sessionId: string): Promise<MonitorSnapshot> {
	return requestWithSession(sessionId, "/api/v1/monitor") as Promise<MonitorSnapshot>;
}

export async function fetchMonitoringStatus(): Promise<MonitorStatus> {
	const response = await fetch(`${getApiBaseUrl()}/api/v1/monitoring/status`);
	if (!response.ok) {
		throw error(response.status, "Failed to load monitoring status.");
	}

	return response.json();
}

export async function fetchRecentControllerEvents(limit = 10): Promise<ControllerEvent[]> {
	const response = await fetch(`${getApiBaseUrl()}/api/v1/monitoring/events?limit=${limit}`);
	if (!response.ok) {
		throw error(response.status, "Failed to load recent controller events.");
	}

	return response.json();
}

export async function createWatchRule(sessionId: string, body: { pattern: string; topdown: boolean }) {
	return requestWithSession(sessionId, "/api/v1/watch-rules", {
		method: "POST",
		body
	});
}

export async function updateWatchRule(
	sessionId: string,
	id: string,
	body: { isActive?: boolean; topdown?: boolean }
) {
	return requestWithSession(sessionId, `/api/v1/watch-rules/${id}`, {
		method: "PATCH",
		body: {
			topdown: typeof body.topdown === "boolean" ? body.topdown : null,
			isActive: typeof body.isActive === "boolean" ? body.isActive : null
		}
	});
}

export async function deleteWatchRule(sessionId: string, id: string) {
	return requestWithSession(sessionId, `/api/v1/watch-rules/${id}`, {
		method: "DELETE"
	});
}

export async function createNotificationChannel(
	sessionId: string,
	body: {
		destination: string;
		displayName: string;
		type: "discord_webhook";
		config?: Partial<DiscordNotificationChannelConfig>;
	}
) {
	return requestWithSession(sessionId, "/api/v1/notification-channels", {
		method: "POST",
		body
	});
}

export async function updateNotificationChannel(
	sessionId: string,
	id: string,
	body: {
		displayName?: string;
		destination?: string;
		config?: Partial<DiscordNotificationChannelConfig> | null;
		isActive?: boolean;
	}
) {
	return requestWithSession(sessionId, `/api/v1/notification-channels/${id}`, {
		method: "PATCH",
		body: {
			displayName: typeof body.displayName === "string" ? body.displayName : null,
			destination: typeof body.destination === "string" ? body.destination : null,
			config: Object.prototype.hasOwnProperty.call(body, "config") ? body.config ?? null : undefined,
			isActive: typeof body.isActive === "boolean" ? body.isActive : null
		}
	});
}

export async function deleteNotificationChannel(sessionId: string, id: string) {
	return requestWithSession(sessionId, `/api/v1/notification-channels/${id}`, {
		method: "DELETE"
	});
}

export async function logoutCurrentSession(sessionId: string): Promise<void> {
	if (!sessionId) {
		return;
	}

	await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
		method: "POST",
		headers: {
			"x-session-id": sessionId
		}
	});
}
