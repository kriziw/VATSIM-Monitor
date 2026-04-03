import type { AuthenticatedSession, UserPreferences } from "@vatsim-monitor/domain";

declare global {
	namespace App {
		interface Locals {
			session: AuthenticatedSession | null;
			preferences?: UserPreferences | null;
		}
	}
}

export {};
