import { env } from "$env/dynamic/private";
import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

function getApiBaseUrl(): string {
	return env.PRIVATE_API_BASE_URL || "http://localhost:8080";
}

export const GET = (async ({ url, locals, fetch }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	if (!locals.preferences?.logsEnabled) {
		throw redirect(302, "/settings");
	}

	const response = await fetch(`${getApiBaseUrl()}/api/v1/logs/export?${url.searchParams.toString()}`, {
		headers: {
			"x-session-id": locals.session.session.id
		}
	});

	if (!response.ok) {
		return new Response("Unable to export logs.", {
			status: response.status
		});
	}

	return new Response(await response.text(), {
		headers: {
			"Content-Type": response.headers.get("content-type") || "text/plain; charset=utf-8",
			"Content-Disposition":
				response.headers.get("content-disposition") || 'attachment; filename="vatsim-monitor-logs.log"'
		}
	});
}) satisfies RequestHandler;
