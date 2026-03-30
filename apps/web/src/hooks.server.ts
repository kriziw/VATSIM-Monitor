import type { Handle } from "@sveltejs/kit";
import { fetchCurrentSession } from "$lib/server/backend";

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get("vm_session") || "";
	event.locals.session = await fetchCurrentSession(sessionId);
	return resolve(event);
};
