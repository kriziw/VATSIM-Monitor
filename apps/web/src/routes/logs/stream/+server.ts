import { env } from "$env/dynamic/private";
import { fetchUserPreferences } from "$lib/server/backend";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

function getApiBaseUrl(): string {
	return env.PRIVATE_API_BASE_URL || "http://localhost:8080";
}

async function loadLogs(fetchFn: typeof fetch, sessionId: string): Promise<string> {
	const response = await fetchFn(`${getApiBaseUrl()}/api/v1/logs?limit=250`, {
		headers: {
			"x-session-id": sessionId
		}
	});

	if (!response.ok) {
		throw new Error("Unable to load logs.");
	}

	return await response.text();
}

function encodeSseMessage(event: string, data: string): string {
	return `event: ${event}\ndata: ${data}\n\n`;
}

export const GET = (async ({ locals, fetch }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	const preferences = await fetchUserPreferences(locals.session.session.id).catch(() => ({
		userId: locals.session!.user.id,
		logsEnabled: false
	}));

	if (!preferences.logsEnabled) {
		throw redirect(302, "/settings");
	}

	const sessionId = locals.session.session.id;
	let interval: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream({
		start(controller) {
			let lastPayload = "";

			const pushLogs = async () => {
				try {
					const payload = await loadLogs(fetch, sessionId);
					if (payload === lastPayload) {
						return;
					}

					lastPayload = payload;
					controller.enqueue(encodeSseMessage("logs", payload));
				} catch {
					controller.enqueue(encodeSseMessage("error", JSON.stringify({ message: "Unable to stream logs." })));
				}
			};

			void pushLogs();
			interval = setInterval(() => {
				void pushLogs();
			}, 2000);
		},
		cancel() {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		}
	});

	return new Response(stream, {
		headers: {
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
			"Content-Type": "text/event-stream"
		}
	});
}) satisfies RequestHandler;
