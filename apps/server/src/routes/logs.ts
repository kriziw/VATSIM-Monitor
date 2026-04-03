import { Router, type Request, type Response } from "express";
import type { AppLogger, LogEntry, LogLevel } from "../lib/logger.js";
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

function parseLogLevel(value: unknown): LogLevel | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
		return normalized;
	}

	return undefined;
}

function parsePositiveInt(value: unknown, fallback: number): number {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback;
	}

	return Math.floor(parsed);
}

function parseSince(req: Request): Date | undefined {
	const mode = typeof req.query.mode === "string" ? req.query.mode : "lines";
	if (mode !== "timespan") {
		return undefined;
	}

	const value = parsePositiveInt(req.query.spanValue, 24);
	const unit = typeof req.query.spanUnit === "string" ? req.query.spanUnit : "hours";
	const now = Date.now();
	const multiplier =
		unit === "minutes"
			? 60_000
			: unit === "days"
				? 86_400_000
				: 3_600_000;

	return new Date(now - value * multiplier);
}

function formatLogEntry(entry: LogEntry): string {
	const meta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";
	return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.source}: ${entry.message}${meta}`;
}

export function createLogsRouter(authService: AuthService, logger: AppLogger): Router {
	const router = Router();

	router.get("/", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const limit = Number(req.query.limit || "200");
		const entries = await logger.query({
			limit,
			minLevel: parseLogLevel(req.query.level)
		});
		res.json(entries);
	});

	router.get("/export", async (req, res) => {
		const authenticatedSession = await requireSession(req, res, authService);
		if (!authenticatedSession) {
			return;
		}

		const mode = typeof req.query.mode === "string" ? req.query.mode : "lines";
		const minLevel = parseLogLevel(req.query.level);
		const entries = await logger.query({
			limit: mode === "lines" ? parsePositiveInt(req.query.lines, 250) : 5000,
			minLevel,
			since: parseSince(req)
		});
		const body = entries.map(formatLogEntry).join("\n");
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.setHeader("Content-Disposition", `attachment; filename="vatsim-monitor-logs-${timestamp}.log"`);
		res.send(body);
	});

	return router;
}
