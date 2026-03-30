import { fetchDashboardData, fetchMonitoringStatus, fetchRecentControllerEvents } from "$lib/server/backend";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	const [monitoringResult, recentEventsResult, dashboardResult] = await Promise.allSettled([
		fetchMonitoringStatus(),
		fetchRecentControllerEvents(12),
		fetchDashboardData(locals.session.session.id)
	]);

	return {
		session: locals.session,
		monitoringStatus: monitoringResult.status === "fulfilled" ? monitoringResult.value : null,
		recentEvents: recentEventsResult.status === "fulfilled" ? recentEventsResult.value : [],
		dashboardData: dashboardResult.status === "fulfilled" ? dashboardResult.value : null,
		statusError: monitoringResult.status === "fulfilled" ? null : "Live network status is temporarily unavailable."
	};
}) satisfies PageServerLoad;
