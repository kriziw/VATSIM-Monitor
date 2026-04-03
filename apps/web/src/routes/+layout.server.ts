import { env } from "$env/dynamic/private";
import { fetchUserPreferences } from "$lib/server/backend";
import { readFileSync } from "node:fs";
import type { LayoutServerLoad } from "./$types";

const LATEST_RELEASE_URL = "https://api.github.com/repos/kriziw/VATSIM-Monitor/releases/latest";
const RELEASE_CACHE_TTL_MS = 15 * 60 * 1000;

type ReleaseBannerInfo = {
	currentVersion: string;
	latestVersion: string;
	url: string;
};

let cachedReleaseBanner: ReleaseBannerInfo | null = null;
let cachedReleaseBannerExpiresAt = 0;

function readPackageVersion(): string {
	try {
		const packagePath = new URL("../../../package.json", import.meta.url);
		const packageJson = JSON.parse(readFileSync(packagePath, "utf-8")) as { version?: string };
		return packageJson.version || "dev";
	} catch {
		return "dev";
	}
}

function normalizeVersion(version: string): string {
	return version.trim().replace(/^v/i, "");
}

function compareVersions(left: string, right: string): number {
	const leftParts = normalizeVersion(left).split(".").map((part) => Number.parseInt(part, 10) || 0);
	const rightParts = normalizeVersion(right).split(".").map((part) => Number.parseInt(part, 10) || 0);
	const length = Math.max(leftParts.length, rightParts.length);

	for (let index = 0; index < length; index += 1) {
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}

	return 0;
}

async function loadReleaseBanner(currentVersion: string): Promise<ReleaseBannerInfo | null> {
	const normalizedCurrentVersion = normalizeVersion(currentVersion);
	const now = Date.now();
	if (cachedReleaseBannerExpiresAt > now) {
		if (!cachedReleaseBanner) {
			return null;
		}

		return compareVersions(cachedReleaseBanner.latestVersion, normalizedCurrentVersion) > 0
			? {
					...cachedReleaseBanner,
					currentVersion: normalizedCurrentVersion
				}
			: null;
	}

	try {
		const response = await fetch(LATEST_RELEASE_URL, {
			headers: {
				"User-Agent": "VATSIM-Monitor"
			}
		});

		if (!response.ok) {
			cachedReleaseBanner = null;
			cachedReleaseBannerExpiresAt = now + RELEASE_CACHE_TTL_MS;
			return null;
		}

		const payload = (await response.json()) as { html_url?: string; tag_name?: string };
		const latestVersion = normalizeVersion(payload.tag_name || "");
		if (!latestVersion || compareVersions(latestVersion, normalizedCurrentVersion) <= 0) {
			cachedReleaseBanner = null;
			cachedReleaseBannerExpiresAt = now + RELEASE_CACHE_TTL_MS;
			return null;
		}

		cachedReleaseBanner = {
			currentVersion: normalizedCurrentVersion,
			latestVersion,
			url: payload.html_url || "https://github.com/kriziw/VATSIM-Monitor/releases/latest"
		};
		cachedReleaseBannerExpiresAt = now + RELEASE_CACHE_TTL_MS;
		return cachedReleaseBanner;
	} catch {
		cachedReleaseBanner = null;
		cachedReleaseBannerExpiresAt = now + RELEASE_CACHE_TTL_MS;
		return null;
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

	const currentVersion = env.APP_VERSION || readPackageVersion();

	return {
		session: locals.session,
		preferences,
		buildInfo: {
			version: currentVersion,
			buildNumber: env.BUILD_NUMBER || env.GITHUB_RUN_NUMBER || "local"
		},
		releaseBanner: await loadReleaseBanner(currentVersion)
	};
}) satisfies LayoutServerLoad;
