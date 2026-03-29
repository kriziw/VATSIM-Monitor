import { Router, type Request } from "express";
import type { AuthService } from "../services/auth-service.js";
import { AuthError } from "../services/auth-service.js";

function readSessionId(req: Request): string {
	const header = req.header("x-session-id");
	return typeof header === "string" ? header : "";
}

export function createAuthRouter(vatsimOAuthEnabled: boolean, authService: AuthService): Router {
	const router = Router();

	router.get("/providers", (_req, res) => {
		res.json({
			local: {
				enabled: true,
				required: true
			},
			vatsim: {
				enabled: vatsimOAuthEnabled,
				required: false
			}
		});
	});

	router.post("/register", async (req, res) => {
		try {
			const result = await authService.register({
				username: typeof req.body?.username === "string" ? req.body.username : "",
				email: typeof req.body?.email === "string" ? req.body.email : null,
				password: typeof req.body?.password === "string" ? req.body.password : ""
			});

			res.status(201).json(result);
		} catch (error) {
			if (error instanceof AuthError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected registration failure." });
		}
	});

	router.post("/login", async (req, res) => {
		try {
			const result = await authService.login({
				identifier: typeof req.body?.identifier === "string" ? req.body.identifier : "",
				password: typeof req.body?.password === "string" ? req.body.password : ""
			});

			res.status(200).json(result);
		} catch (error) {
			if (error instanceof AuthError) {
				res.status(error.status).json({ message: error.message });
				return;
			}

			res.status(500).json({ message: "Unexpected login failure." });
		}
	});

	router.get("/session", async (req, res) => {
		const authenticatedSession = await authService.getAuthenticatedSession(readSessionId(req));
		if (!authenticatedSession) {
			res.status(401).json({ message: "Session not found." });
			return;
		}

		res.json(authenticatedSession);
	});

	router.post("/logout", async (req, res) => {
		await authService.logout(readSessionId(req));
		res.sendStatus(204);
	});

	return router;
}
