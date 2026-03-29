import { Router, type Request, type Response } from "express";
import type { AuthService } from "../services/auth-service.js";
import { AccountError, AccountService } from "../services/account-service.js";

async function requireSession(req: Request, res: Response, authService: AuthService) {
	const sessionId = req.header("x-session-id") || "";
	const authenticatedSession = await authService.getAuthenticatedSession(sessionId);

	if (!authenticatedSession) {
		res.status(401).json({ message: "Authentication required." });
		return null;
	}

	return authenticatedSession;
}

export function createAccountRouter(authService: AuthService, accountService: AccountService): Router {
	const router = Router();

	router.get("/dashboard", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const data = await accountService.getDashboardData(authenticatedSession.user.id);
		res.json(data);
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
				req.body?.topdown === true
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
			await accountService.deleteWatchRule(authenticatedSession.user.id, req.params.id);
			res.sendStatus(204);
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
				displayName: typeof req.body?.displayName === "string" ? req.body.displayName : null
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
				isActive: typeof req.body?.isActive === "boolean" ? req.body.isActive : undefined
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

	return router;
}
