export interface AppConfig {
	host: string;
	port: number;
	trustProxy: boolean | number | string;
	vatsimOAuthEnabled: boolean;
	pollIntervalMs: number;
		logging: {
			directory: string;
			maxFileSizeBytes: number;
		maxFiles: number;
		level: "debug" | "error" | "info" | "warn";
	};
	database: {
		host: string;
		port: number;
		user: string;
		password: string;
		database: string;
	};
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
	if (!value || value.trim().length === 0) {
		return false;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized === "true") {
		return true;
	}

	if (normalized === "false") {
		return false;
	}

	if (/^\d+$/.test(normalized)) {
		return Number(normalized);
	}

	return value.trim();
}

function parseLogLevel(value: string | undefined): "debug" | "error" | "info" | "warn" {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "debug" || normalized === "warn" || normalized === "error") {
		return normalized;
	}

	return "info";
}

export function loadConfig(): AppConfig {
	return {
		host: process.env.HOST || "0.0.0.0",
		port: Number(process.env.PORT || "8080"),
		trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
		vatsimOAuthEnabled: process.env.VATSIM_OAUTH_ENABLED === "true",
		pollIntervalMs: Number(process.env.MONITOR_POLL_INTERVAL_MS || "15000"),
		logging: {
			directory: process.env.LOG_DIR || "./logs",
			maxFileSizeBytes: Number(process.env.LOG_MAX_FILE_SIZE_BYTES || "104857600"),
			maxFiles: Number(process.env.LOG_MAX_FILES || "5"),
			level: parseLogLevel(process.env.LOG_LEVEL)
		},
		database: {
			host: process.env.MYSQL_HOST || "127.0.0.1",
			port: Number(process.env.MYSQL_PORT || "3306"),
			user: process.env.MYSQL_USER || "root",
			password: process.env.MYSQL_PASSWORD || "",
			database: process.env.MYSQL_DATABASE || "vatsim_monitor"
		}
	};
}
