import { logoutCurrentSession } from "$lib/server/backend";
import type { RequestHandler } from "./$types";

export const GET = (async ({ cookies }) => {
	const sessionId = cookies.get("vm_session") || "";
	await logoutCurrentSession(sessionId);
	cookies.delete("vm_session", { path: "/" });

	return new Response(null, {
		status: 302,
		headers: {
			Location: "/"
		}
	});
}) satisfies RequestHandler;
