import { Router } from "express";
import type { UkTopdownResolver } from "@vatsim-monitor/integrations";

export function createTopdownRouter(topdownResolver: UkTopdownResolver): Router {
	const router = Router();

	router.get("/icao/:icao", async (req, res) => {
		const icao = String(req.params.icao || "").toUpperCase();
		if (!icao || !icao.startsWith("EG")) {
			res.status(400).json({
				message: "Top-down ICAO lookup is currently available only for UK ICAOs."
			});
			return;
		}

		const controllers = await topdownResolver.getControllersForAirfield(icao);
		if (!controllers) {
			res.status(404).json({ message: "No airfield found for ICAO." });
			return;
		}

		res.json(controllers);
	});

	router.get("/callsign/:callsign", async (req, res) => {
		const callsign = String(req.params.callsign || "").toUpperCase();
		if (!callsign) {
			res.status(400).json({ message: "Callsign is required." });
			return;
		}

		const controllers = await topdownResolver.getControllersForCallsign(callsign);
		if (!controllers) {
			res.status(404).json({ message: "No top-down controllers found for callsign." });
			return;
		}

		res.json(controllers);
	});

	return router;
}
