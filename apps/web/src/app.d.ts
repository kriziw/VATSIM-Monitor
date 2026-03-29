import type { AuthenticatedSession } from "@vatsim-monitor/domain";

declare global {
	namespace App {
		interface Locals {
			session: AuthenticatedSession | null;
		}
	}
}

export {};
