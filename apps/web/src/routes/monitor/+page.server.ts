import { fetchDashboardData, fetchMonitorSnapshot, fetchMonitoringStatus, fetchWatchlistEvents } from "$lib/server/backend";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals, depends }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	depends("app:monitor");

	const [monitoringResult, recentEventsResult, dashboardResult, monitorSnapshotResult] = await Promise.allSettled([
		fetchMonitoringStatus(),
		fetchWatchlistEvents(locals.session.session.id, 12),
		fetchDashboardData(locals.session.session.id),
		fetchMonitorSnapshot(locals.session.session.id)
	]);

	return {
		session: locals.session,
		monitoringStatus: monitoringResult.status === "fulfilled" ? monitoringResult.value : null,
		recentEvents: recentEventsResult.status === "fulfilled" ? recentEventsResult.value : [],
		dashboardData: dashboardResult.status === "fulfilled" ? dashboardResult.value : null,
		monitorSnapshot: monitorSnapshotResult.status === "fulfilled"
			? monitorSnapshotResult.value
			: { watchedControllers: [], otherControllers: [] },
		statusError: monitoringResult.status === "fulfilled" ? null : "Live network status is temporarily unavailable."
	};
}) satisfies PageServerLoad;
