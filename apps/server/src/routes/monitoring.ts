import { Router } from "express";
import type { MonitoringService } from "../services/monitoring-service.js";

export function createMonitoringRouter(monitoringService: MonitoringService): Router {
	const router = Router();

	router.get("/status", (_req, res) => {
		res.json(monitoringService.getStatus());
	});

	router.get("/features", (_req, res) => {
		res.json({
			watchRules: true,
			discordWebhooks: true,
			webPush: true,
			vatsimOAuthOptional: true,
			ukTopdown: true
		});
	});

	router.get("/events", async (req, res) => {
		const limit = Number(req.query.limit || "20");
		const events = await monitoringService.listRecentEvents(limit);
		res.json(events);
	});

	return router;
}
