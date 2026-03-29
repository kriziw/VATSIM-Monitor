export interface AppConfig {
	host: string;
	port: number;
	vatsimOAuthEnabled: boolean;
	pollIntervalMs: number;
	database: {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
	};
}

export function loadConfig(): AppConfig {
	return {
		host: process.env.HOST || "0.0.0.0",
		port: Number(process.env.PORT || "8080"),
		vatsimOAuthEnabled: process.env.VATSIM_OAUTH_ENABLED === "true",
		pollIntervalMs: Number(process.env.MONITOR_POLL_INTERVAL_MS || "15000"),
		database: {
			host: process.env.MYSQL_HOST || "127.0.0.1",
			port: Number(process.env.MYSQL_PORT || "3306"),
			user: process.env.MYSQL_USER || "root",
			password: process.env.MYSQL_PASSWORD || "",
			database: process.env.MYSQL_DATABASE || "vatsim_monitor"
		}
	};
}
