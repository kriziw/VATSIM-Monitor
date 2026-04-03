import { Router, type Request, type Response } from "express";
import type { PartialDiscordNotificationChannelConfig } from "@vatsim-monitor/domain";
import type { AuthService } from "../services/auth-service.js";
import { AccountError, AccountService } from "../services/account-service.js";
import type { MonitoringService } from "../services/monitoring-service.js";

async function requireSession(req: Request, res: Response, authService: AuthService) {
	const sessionId = req.header("x-session-id") || "";
	const authenticatedSession = await authService.getAuthenticatedSession(sessionId);

	if (!authenticatedSession) {
		res.status(401).json({ message: "Authentication required." });
		return null;
	}

	return authenticatedSession;
}

function parseDiscordConfig(body: unknown): PartialDiscordNotificationChannelConfig | undefined {
	if (!body || typeof body !== "object") {
		return undefined;
	}

	return body as PartialDiscordNotificationChannelConfig;
}

function parseWatchRuleIds(body: unknown): string[] | undefined {
	if (!Array.isArray(body)) {
		return undefined;
	}

	return body.filter((value): value is string => typeof value === "string");
}

export function createAccountRouter(
	authService: AuthService,
	accountService: AccountService,
	monitoringService: MonitoringService
): Router {
	const router = Router();

	router.get("/dashboard", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		res.json(data);
	});

	router.get("/preferences", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		res.json(data.preferences);
	});

	router.get("/app-settings", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		res.json(data.appSettings);
	});

	router.get("/monitor", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		const snapshot = await monitoringService.getMonitorSnapshot(data.watchRules);
		res.json(snapshot);
	});

	router.get("/monitor/events", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		const limit = Number(req.query.limit || "12");
		const events = await monitoringService.listRecentWatchlistEvents(data.watchRules, limit);
		res.json(events);
	});

	router.post("/watch-rules", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const watchRule = await accountService.createWatchRule(
				authenticatedSession.user.id,
				typeof req.body?.pattern === "string" ? req.body.pattern : "",
				req.body?.topdown === true,
				req.body?.excludeObservers === true
			);
			res.status(201).json(watchRule);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected watch rule creation failure." });
		}
	});

	router.patch("/watch-rules/:id", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const watchRule = await accountService.updateWatchRule(authenticatedSession.user.id, req.params.id, {
				topdown: typeof req.body?.topdown === "boolean" ? req.body.topdown : undefined,
				excludeObservers:
					typeof req.body?.excludeObservers === "boolean" ? req.body.excludeObservers : undefined,
				isActive: typeof req.body?.isActive === "boolean" ? req.body.isActive : undefined
			});
			res.json(watchRule);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected watch rule update failure." });
		}
	});

	router.delete("/watch-rules/:id", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const result = await accountService.deleteWatchRule(authenticatedSession.user.id, req.params.id);
			res.json(result);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected watch rule deletion failure." });
		}
	});

	router.post("/notification-channels", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const channel = await accountService.createNotificationChannel(authenticatedSession.user.id, {
				type: req.body?.type,
				destination: typeof req.body?.destination === "string" ? req.body.destination : "",
				displayName: typeof req.body?.displayName === "string" ? req.body.displayName : null,
				config: parseDiscordConfig(req.body?.config),
				watchRuleIds: parseWatchRuleIds(req.body?.watchRuleIds)
			});
			res.status(201).json(channel);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected notification channel creation failure." });
		}
	});

	router.patch("/notification-channels/:id", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const channel = await accountService.updateNotificationChannel(authenticatedSession.user.id, req.params.id, {
				displayName: typeof req.body?.displayName === "string" ? req.body.displayName : undefined,
				destination: typeof req.body?.destination === "string" ? req.body.destination : undefined,
				config: Object.prototype.hasOwnProperty.call(req.body || {}, "config")
					? parseDiscordConfig(req.body?.config) ?? null
					: undefined,
				isActive: typeof req.body?.isActive === "boolean" ? req.body.isActive : undefined,
				watchRuleIds: Object.prototype.hasOwnProperty.call(req.body || {}, "watchRuleIds")
					? parseWatchRuleIds(req.body?.watchRuleIds) ?? []
					: undefined
			});
			res.json(channel);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected notification channel update failure." });
		}
	});

	router.delete("/notification-channels/:id", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			await accountService.deleteNotificationChannel(authenticatedSession.user.id, req.params.id);
			res.sendStatus(204);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected notification channel deletion failure." });
		}
	});

	router.patch("/preferences", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const preferences = await accountService.updatePreferences(authenticatedSession.user.id, {
				logsEnabled: typeof req.body?.logsEnabled === "boolean" ? req.body.logsEnabled : undefined
			});
			res.json(preferences);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected preference update failure." });
		}
	});

	router.patch("/app-settings", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		try {
			const appSettings = await accountService.updateAppSettings({
				logMaxFileSizeBytes:
					typeof req.body?.logMaxFileSizeBytes === "number" ? req.body.logMaxFileSizeBytes : undefined
			});
			res.json(appSettings);
		} catch (error) {
			if (error instanceof AccountError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected application settings update failure." });
		}
	});

	return router;
}
