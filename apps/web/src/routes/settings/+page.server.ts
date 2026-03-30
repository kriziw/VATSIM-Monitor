import {
	createNotificationChannel,
	createWatchRule,
	deleteNotificationChannel,
	deleteWatchRule,
	fetchDashboardData,
	updateNotificationChannel,
	updateWatchRule
} from "$lib/server/backend";
import { fail, redirect, type Cookies } from "@sveltejs/kit";
import type { DiscordNotificationChannelConfig } from "@vatsim-monitor/domain";
import type { Actions, PageServerLoad } from "./$types";

function getSessionId(cookies: Cookies): string {
	return cookies.get("vm_session") || "";
}

function readDiscordConfig(form: FormData): Partial<DiscordNotificationChannelConfig> {
	return {
		titleTemplate: String(form.get("titleTemplate") || ""),
		descriptionTemplate: String(form.get("descriptionTemplate") || ""),
		contentTemplate: String(form.get("contentTemplate") || ""),
		color: String(form.get("color") || "")
	};
}

export const load = (async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	const dashboardData = await fetchDashboardData(locals.session.session.id);

	return {
		session: locals.session,
		watchRules: dashboardData.watchRules,
		notificationChannels: dashboardData.notificationChannels
	};
}) satisfies PageServerLoad;

export const actions = {
	addWatchRule: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const pattern = String(form.get("pattern") || "");
		const topdown = form.get("topdown") === "on";

		try {
			await createWatchRule(sessionId, { pattern, topdown });
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "watchRules",
				message: error?.body?.message ?? error?.message ?? "Unable to add watch rule.",
				pattern
			});
		}
	},
	toggleWatchRule: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const id = String(form.get("id") || "");
		const topdown = form.get("topdown") === "true";
		const isActive = form.get("isActive") === "true";

		try {
			await updateWatchRule(sessionId, id, { topdown, isActive });
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "watchRules",
				message: error?.body?.message ?? error?.message ?? "Unable to update watch rule."
			});
		}
	},
	deleteWatchRule: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const id = String(form.get("id") || "");

		try {
			await deleteWatchRule(sessionId, id);
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "watchRules",
				message: error?.body?.message ?? error?.message ?? "Unable to delete watch rule."
			});
		}
	},
	addNotificationChannel: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const displayName = String(form.get("displayName") || "");
		const destination = String(form.get("destination") || "");

		try {
			await createNotificationChannel(sessionId, {
				type: "discord_webhook",
				displayName,
				destination,
				config: undefined
			});
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				message: error?.body?.message ?? error?.message ?? "Unable to add notification channel.",
				displayName,
				destination
			});
		}
	},
	saveNotificationChannel: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

	const form = await request.formData();
	const id = String(form.get("id") || "");
	const displayName = String(form.get("displayName") || "");
	const destination = String(form.get("destination") || "").trim();
	const config = readDiscordConfig(form);

	try {
		await updateNotificationChannel(sessionId, id, {
			displayName,
			destination: destination.length > 0 ? destination : undefined,
			config
		});
		return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				channelId: id,
				message: error?.body?.message ?? error?.message ?? "Unable to save notification settings.",
				displayName,
				destination,
				titleTemplate: config.titleTemplate ?? "",
				descriptionTemplate: config.descriptionTemplate ?? "",
				contentTemplate: config.contentTemplate ?? "",
				color: config.color ?? ""
			});
		}
	},
	toggleNotificationChannel: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const id = String(form.get("id") || "");
		const isActive = form.get("isActive") === "true";

		try {
			await updateNotificationChannel(sessionId, id, { isActive });
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				message: error?.body?.message ?? error?.message ?? "Unable to update notification channel."
			});
		}
	},
	deleteNotificationChannel: async ({ request, cookies }) => {
		const sessionId = getSessionId(cookies);
		if (!sessionId) {
			throw redirect(302, "/login");
		}

		const form = await request.formData();
		const id = String(form.get("id") || "");

		try {
			await deleteNotificationChannel(sessionId, id);
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				message: error?.body?.message ?? error?.message ?? "Unable to delete notification channel."
			});
		}
	}
} satisfies Actions;
