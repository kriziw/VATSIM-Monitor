import { env } from "$env/dynamic/private";
import { fetchUserPreferences } from "$lib/server/backend";
import { readFileSync } from "node:fs";
import type { LayoutServerLoad } from "./$types";

function readPackageVersion(): string {
	try {
		const packagePath = new URL("../../../package.json", import.meta.url);
		const packageJson = JSON.parse(readFileSync(packagePath, "utf-8")) as { version?: string };
		return packageJson.version || "dev";
	} catch {
		return "dev";
	}
}

export const load = (async ({ locals }) => {
	const preferences = locals.session
		? await fetchUserPreferences(locals.session.session.id).catch(() => ({
				userId: locals.session!.user.id,
				logsEnabled: false
			}))
		: null;

	locals.preferences = preferences;

	return {
		session: locals.session,
		preferences,
		buildInfo: {
			version: env.APP_VERSION || readPackageVersion(),
			buildNumber: env.BUILD_NUMBER || env.GITHUB_RUN_NUMBER || "local"
		}
	};
}) satisfies LayoutServerLoad;
