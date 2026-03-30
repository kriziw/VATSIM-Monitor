import { fetchMonitoringStatus, fetchRecentControllerEvents } from "$lib/server/backend";
import type { PageServerLoad } from "./$types";

export const load = (async () => {
	try {
		const [monitoringStatus, recentEvents] = await Promise.all([
			fetchMonitoringStatus(),
			fetchRecentControllerEvents(6)
		]);

		return {
			monitoringStatus,
			recentEvents,
			statusError: null
		};
	} catch {
		return {
			monitoringStatus: null,
			recentEvents: [],
			statusError: "Live network status is temporarily unavailable."
		};
	}
}) satisfies PageServerLoad;
