import {
	createNotificationChannel,
	deleteNotificationChannel,
	fetchDashboardData,
	updateNotificationChannel
} from "$lib/server/backend";
import { fail, redirect, type Cookies } from "@sveltejs/kit";
import type {
	DiscordNotificationChannelConfig,
	DiscordNotificationTemplateType
} from "@vatsim-monitor/domain";
import type { Actions, PageServerLoad } from "./$types";

function getSessionId(cookies: Cookies): string {
	return cookies.get("vm_session") || "";
}

function readDiscordTemplate(
	form: FormData,
	prefix: DiscordNotificationTemplateType
): DiscordNotificationChannelConfig["controllerOnline"] {
	return {
		titleTemplate: String(form.get(`${prefix}TitleTemplate`) || ""),
		descriptionTemplate: String(form.get(`${prefix}DescriptionTemplate`) || ""),
		contentTemplate: String(form.get(`${prefix}ContentTemplate`) || ""),
		color: String(form.get(`${prefix}Color`) || "")
	};
}

function readSelectedTemplate(form: FormData): DiscordNotificationTemplateType {
	const value = String(form.get("selectedTemplate") || "");
	if (value === "controllerOffline" || value === "controllerChange") {
		return value;
	}

	return "controllerOnline";
}

export const load = (async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, "/login");
	}

	const dashboardData = await fetchDashboardData(locals.session.session.id);

	return {
		session: locals.session,
		notificationChannels: dashboardData.notificationChannels
	};
}) satisfies PageServerLoad;

export const actions = {
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
		const selectedTemplate = readSelectedTemplate(form);
		const config: Partial<DiscordNotificationChannelConfig> = {
			[selectedTemplate]: readDiscordTemplate(form, selectedTemplate)
		};

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
				selectedTemplate,
				message: error?.body?.message ?? error?.message ?? "Unable to save notification settings.",
				displayName,
				destination,
				config
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
		const selectedTemplate = readSelectedTemplate(form);

		try {
			await updateNotificationChannel(sessionId, id, { isActive });
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				channelId: id,
				selectedTemplate,
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
		const selectedTemplate = readSelectedTemplate(form);

		try {
			await deleteNotificationChannel(sessionId, id);
			return { success: true };
		} catch (error: any) {
			return fail(error?.status || 500, {
				section: "notificationChannels",
				channelId: id,
				selectedTemplate,
				message: error?.body?.message ?? error?.message ?? "Unable to delete notification channel."
			});
		}
	}
} satisfies Actions;
