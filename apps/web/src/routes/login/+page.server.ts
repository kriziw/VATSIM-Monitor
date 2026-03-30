import { postAuthRequest } from "$lib/server/backend";
import { fail, redirect, type Cookies } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const SESSION_COOKIE_NAME = "vm_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function setSessionCookie(cookies: Cookies, sessionId: string, secure: boolean) {
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure,
		maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
	});
}

export const load = (async ({ locals }) => {
	if (locals.session) {
		throw redirect(302, "/dashboard");
	}

	return {};
}) satisfies PageServerLoad;

export const actions = {
	login: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const identifier = String(form.get("identifier") || "");
		const password = String(form.get("password") || "");
		let sessionId = "";

		try {
			const response = await postAuthRequest("/api/v1/auth/login", { identifier, password });
			sessionId = response.session.id;
		} catch (error: any) {
			if (error?.status) {
				return fail(error.status, {
					mode: "login",
					message: error.body?.message ?? error.message ?? "Unable to sign in right now.",
					identifier
				});
			}

			return fail(500, {
				mode: "login",
				message: "Unable to sign in right now.",
				identifier
			});
		}

		setSessionCookie(cookies, sessionId, url.protocol === "https:");
		throw redirect(302, "/dashboard");
	},
	register: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = String(form.get("username") || "");
		const email = String(form.get("email") || "");
		const password = String(form.get("password") || "");
		let sessionId = "";

		try {
			const response = await postAuthRequest("/api/v1/auth/register", {
				username,
				email,
				password
			});
			sessionId = response.session.id;
		} catch (error: any) {
			if (error?.status) {
				return fail(error.status, {
					mode: "register",
					message: error.body?.message ?? error.message ?? "Unable to register right now.",
					username,
					email
				});
			}

			return fail(500, {
				mode: "register",
				message: "Unable to register right now.",
				username,
				email
			});
		}

		setSessionCookie(cookies, sessionId, url.protocol === "https:");
		throw redirect(302, "/dashboard");
	}
} satisfies Actions;
