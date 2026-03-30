import { env } from "$env/dynamic/private";
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
	return {
		session: locals.session,
		buildInfo: {
			version: env.APP_VERSION || readPackageVersion(),
			buildNumber: env.BUILD_NUMBER || env.GITHUB_RUN_NUMBER || "local"
		}
	};
}) satisfies LayoutServerLoad;
