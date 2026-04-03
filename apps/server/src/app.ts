import express from "express";
import {
	AuthStore,
	ControllerEventStore,
	IgnoredControllerStore,
	NotificationChannelStore,
	NotificationDeliveryStore,
	NotificationRoutingStore,
	UserPreferenceStore,
	WatchRuleStore,
	createMysqlPool
} from "@vatsim-monitor/data";
import {
	DiscordWebhookNotifier,
	HttpVatsimDataClient,
	UkTopdownResolver
} from "@vatsim-monitor/integrations";
import type { AppLogger } from "./lib/logger.js";
import { createAccountRouter } from "./routes/account.js";
import { createAuthRouter } from "./routes/auth.js";
import { createLogsRouter } from "./routes/logs.js";
import { createMonitoringRouter } from "./routes/monitoring.js";
import { createTopdownRouter } from "./routes/topdown.js";
import type { AppConfig } from "./config.js";
import { AccountService } from "./services/account-service.js";
import { AuthService } from "./services/auth-service.js";
import { MonitoringService } from "./services/monitoring-service.js";

export function createApp(config: AppConfig, logger: AppLogger) {
	const app = express();
	const mysqlPool = createMysqlPool(config.database);
	const authStore = new AuthStore(mysqlPool);
	const authService = new AuthService(authStore);
	const watchRuleStore = new WatchRuleStore(mysqlPool);
	const notificationChannelStore = new NotificationChannelStore(mysqlPool);
	const userPreferenceStore = new UserPreferenceStore(mysqlPool);
	const accountService = new AccountService(watchRuleStore, notificationChannelStore, userPreferenceStore);
	const ignoredControllerStore = new IgnoredControllerStore(mysqlPool);
	const notificationRoutingStore = new NotificationRoutingStore(mysqlPool);
	const controllerEventStore = new ControllerEventStore(mysqlPool);
	const notificationDeliveryStore = new NotificationDeliveryStore(mysqlPool);
	const topdownResolver = new UkTopdownResolver();
	const monitoringService = new MonitoringService({
		pollIntervalMs: config.pollIntervalMs,
		vatsimClient: new HttpVatsimDataClient(),
		topdownResolver,
		discordNotifier: new DiscordWebhookNotifier(),
		ignoredControllerStore,
		notificationRoutingStore,
		controllerEventStore,
		notificationDeliveryStore,
		topdownProviderState: "active",
		logger
	});

	app.set("trust proxy", config.trustProxy);
	app.use(express.json());
	app.use((req, res, next) => {
		const startedAtMs = Date.now();

		res.on("finish", () => {
			if (req.path === "/health" || req.originalUrl.startsWith("/api/v1/logs")) {
				return;
			}

			logger.info("http", `${req.method} ${req.originalUrl}`, {
				durationMs: Date.now() - startedAtMs,
				ip: req.ip,
				statusCode: res.statusCode
			});
		});

		next();
	});

	app.get("/health", (_req, res) => {
		res.json({
			name: "vatsim-monitor-server",
			status: "ok"
		});
	});

	app.get("/api/v1/status", (_req, res) => {
		res.json({
			authMode: "local-first",
			vatsimOAuthEnabled: config.vatsimOAuthEnabled,
			monitoring: monitoringService.getStatus(),
			database: config.database.database
		});
	});

	app.use("/api/v1/auth", createAuthRouter(config.vatsimOAuthEnabled, authService));
	app.use("/api/v1", createAccountRouter(authService, accountService, monitoringService));
	app.use("/api/v1/logs", createLogsRouter(authService, logger));
	app.use("/api/v1/monitoring", createMonitoringRouter(monitoringService));
	app.use("/api/v1/topdown", createTopdownRouter(topdownResolver));

	monitoringService.start();

	return app;
}
