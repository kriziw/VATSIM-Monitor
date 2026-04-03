import { Router, type Request, type Response } from "express";
import type { AppLogger } from "../lib/logger.js";
import type { AuthService } from "../services/auth-service.js";

async function requireSession(req: Request, res: Response, authService: AuthService) {
	const sessionId = req.header("x-session-id") || "";
	const authenticatedSession = await authService.getAuthenticatedSession(sessionId);

	if (!authenticatedSession) {
		res.status(401).json({ message: "Authentication required." });
		return null;
	}

	return authenticatedSession;
}

export function createLogsRouter(authService: AuthService, logger: AppLogger): Router {
	const router = Router();

	router.get("/", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const limit = Number(req.query.limit || "200");
		const entries = await logger.listRecent(limit);
		res.json(entries);
	});

	return router;
}
