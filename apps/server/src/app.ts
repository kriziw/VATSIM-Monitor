import cors from "cors";
import express from "express";
import {
	AuthStore,
	ControllerEventStore,
	IgnoredControllerStore,
	NotificationChannelStore,
	NotificationDeliveryStore,
	NotificationRoutingStore,
	WatchRuleStore,
	createMysqlPool
} from "@vatsim-monitor/data";
import {
	DiscordWebhookNotifier,
	HttpVatsimDataClient,
	UkTopdownResolver
} from "@vatsim-monitor/integrations";
import { createAccountRouter } from "./routes/account.js";
import { createAuthRouter } from "./routes/auth.js";
import { createMonitoringRouter } from "./routes/monitoring.js";
import { createTopdownRouter } from "./routes/topdown.js";
import type { AppConfig } from "./config.js";
import { AccountService } from "./services/account-service.js";
import { AuthService } from "./services/auth-service.js";
import { MonitoringService } from "./services/monitoring-service.js";

export function createApp(config: AppConfig) {
	const app = express();
	const mysqlPool = createMysqlPool(config.database);
	const authStore = new AuthStore(mysqlPool);
	const authService = new AuthService(authStore);
	const watchRuleStore = new WatchRuleStore(mysqlPool);
	const notificationChannelStore = new NotificationChannelStore(mysqlPool);
	const accountService = new AccountService(watchRuleStore, notificationChannelStore);
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
		topdownProviderState: "active"
	});

	app.use(cors());
	app.use(express.json());

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
	app.use("/api/v1/monitoring", createMonitoringRouter(monitoringService));
	app.use("/api/v1/topdown", createTopdownRouter(topdownResolver));

	monitoringService.start();

	return app;
}
