import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { AppLogger } from "./lib/logger.js";

const config = loadConfig();
const logger = new AppLogger({
	directory: config.logging.directory,
	maxFileSizeBytes: config.logging.maxFileSizeBytes,
	maxFiles: config.logging.maxFiles,
	minLevel: config.logging.level
});
const app = createApp(config, logger);

process.on("unhandledRejection", (error) => {
	logger.error("process", "Unhandled promise rejection.", error);
});

process.on("uncaughtException", (error) => {
	logger.error("process", "Uncaught exception.", error);
});

app.listen(config.port, config.host, () => {
	logger.info("server", `VATSIM Monitor server listening on http://${config.host}:${config.port}`);
});

