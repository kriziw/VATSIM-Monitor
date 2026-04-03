import { fetchDashboardData, fetchLogs } from "$lib/server/backend";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = (async ({ locals, depends }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	const dashboardData = await fetchDashboardData(locals.session.session.id);
	if (!dashboardData.preferences.logsEnabled) {
		throw redirect(302, "/settings");
	}

	depends("app:logs");

	return {
		session: locals.session,
		preferences: dashboardData.preferences,
		logs: await fetchLogs(locals.session.session.id, 250)
	};
}) satisfies PageServerLoad;
