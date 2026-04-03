import { mkdir, readFile, rename, rm, stat, appendFile } from "node:fs/promises";
import path from "node:path";

export type LogLevel = "debug" | "error" | "info" | "warn";

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	source: string;
	message: string;
	meta: Record<string, unknown> | null;
}

export interface LoggerOptions {
	directory: string;
	maxFileSizeBytes: number;
	maxFiles: number;
	minLevel?: LogLevel;
	fileName?: string;
	echoToConsole?: boolean;
}

export interface LogQueryOptions {
	limit?: number;
	minLevel?: LogLevel;
	since?: Date;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toErrorMeta(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack ?? null
		};
	}

	if (isObject(error)) {
		return error;
	}

	return {
		value: String(error)
	};
}

export class AppLogger {
	public static readonly MAX_LOG_FILE_SIZE_BYTES = 100 * 1024 * 1024;
	private readonly directory: string;
	private readonly fileName: string;
	private maxFileSizeBytes: number;
	private readonly maxFiles: number;
	private readonly echoToConsole: boolean;
	private readonly minLevel: LogLevel;
	private writeChain: Promise<void> = Promise.resolve();

	constructor(options: LoggerOptions) {
		this.directory = options.directory;
		this.fileName = options.fileName || "app.log";
		this.maxFileSizeBytes = this.normalizeMaxFileSizeBytes(options.maxFileSizeBytes);
		this.maxFiles = Math.max(options.maxFiles, 1);
		this.echoToConsole = options.echoToConsole ?? true;
		this.minLevel = options.minLevel ?? "info";
	}

	public debug(source: string, message: string, meta?: unknown): void {
		this.enqueue("debug", source, message, this.normalizeMeta(meta));
	}

	public setMaxFileSizeBytes(value: number): void {
		this.maxFileSizeBytes = this.normalizeMaxFileSizeBytes(value);
	}

	public getMaxFileSizeBytes(): number {
		return this.maxFileSizeBytes;
	}

	public info(source: string, message: string, meta?: unknown): void {
		this.enqueue("info", source, message, this.normalizeMeta(meta));
	}

	public warn(source: string, message: string, meta?: unknown): void {
		this.enqueue("warn", source, message, this.normalizeMeta(meta));
	}

	public error(source: string, message: string, error?: unknown, meta?: unknown): void {
		const normalizedMeta = this.normalizeMeta(meta);
		const mergedMeta =
			error === undefined
				? normalizedMeta
				: {
						...(normalizedMeta ?? {}),
						error: toErrorMeta(error)
					};
		this.enqueue("error", source, message, mergedMeta);
	}

	public async listRecent(limit = 200): Promise<LogEntry[]> {
		return this.query({
			limit
		});
	}

	public async query(options: LogQueryOptions = {}): Promise<LogEntry[]> {
		const safeLimit = Math.min(Math.max(options.limit ?? 200, 1), 5000);
		const minLevel = options.minLevel ?? "debug";
		const sinceMs = options.since ? options.since.getTime() : null;
		const entries: LogEntry[] = [];

		for (const filePath of this.getLogFilePaths()) {
			const raw = await readFile(filePath, "utf-8").catch(() => null);
			if (!raw) {
				continue;
			}

			const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
			for (let index = lines.length - 1; index >= 0; index -= 1) {
				let entry: LogEntry;

				try {
					const parsed = JSON.parse(lines[index]) as LogEntry;
					entry = {
						timestamp: parsed.timestamp,
						level: parsed.level,
						source: parsed.source,
						message: parsed.message,
						meta: parsed.meta && isObject(parsed.meta) ? parsed.meta : null
					};
				} catch {
					entry = {
						timestamp: new Date().toISOString(),
						level: "warn",
						source: "logger",
						message: "Unreadable log entry",
						meta: {
							filePath
						}
					};
				}

				if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[minLevel]) {
					continue;
				}

				if (sinceMs !== null && new Date(entry.timestamp).getTime() < sinceMs) {
					continue;
				}

				entries.push(entry);

				if (entries.length >= safeLimit) {
					return entries;
				}
			}
		}

		return entries;
	}

	private enqueue(
		level: LogLevel,
		source: string,
		message: string,
		meta: Record<string, unknown> | null
	): void {
		if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
			return;
		}

		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			source,
			message,
			meta
		};

		if (this.echoToConsole) {
			const renderedMeta = entry.meta ? ` ${JSON.stringify(entry.meta)}` : "";
			const line = `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.source}: ${entry.message}${renderedMeta}`;
			if (entry.level === "error") {
				console.error(line);
			} else if (entry.level === "warn") {
				console.warn(line);
			} else if (entry.level === "debug") {
				console.debug(line);
			} else {
				console.log(line);
			}
		}

		const serialized = `${JSON.stringify(entry)}\n`;
		this.writeChain = this.writeChain
			.then(async () => {
				await mkdir(this.directory, { recursive: true });
				await this.rotateIfNeeded(Buffer.byteLength(serialized, "utf-8"));
				await appendFile(this.getActiveLogPath(), serialized, "utf-8");
			})
			.catch((error) => {
				console.error("Failed to write application log entry.", error);
			});
	}

	private async rotateIfNeeded(nextEntryBytes: number): Promise<void> {
		const activeLogPath = this.getActiveLogPath();
		const currentStat = await stat(activeLogPath).catch(() => null);
		if (!currentStat || currentStat.size + nextEntryBytes <= this.maxFileSizeBytes) {
			return;
		}

		const oldestArchivedPath = this.getArchivedLogPath(this.maxFiles);
		await rm(oldestArchivedPath, { force: true }).catch(() => undefined);

		for (let index = this.maxFiles - 1; index >= 1; index -= 1) {
			const sourcePath = this.getArchivedLogPath(index);
			const targetPath = this.getArchivedLogPath(index + 1);
			await rename(sourcePath, targetPath).catch(() => undefined);
		}

		await rename(activeLogPath, this.getArchivedLogPath(1)).catch(() => undefined);
	}

	private getLogFilePaths(): string[] {
		return [
			this.getActiveLogPath(),
			...Array.from({ length: this.maxFiles }, (_, index) => this.getArchivedLogPath(index + 1))
		];
	}

	private getActiveLogPath(): string {
		return path.join(this.directory, this.fileName);
	}

	private getArchivedLogPath(index: number): string {
		return path.join(this.directory, `${this.fileName}.${index}`);
	}

	private normalizeMaxFileSizeBytes(value: number): number {
		if (!Number.isFinite(value)) {
			return AppLogger.MAX_LOG_FILE_SIZE_BYTES;
		}

		return Math.min(Math.max(Math.floor(value), 32_768), AppLogger.MAX_LOG_FILE_SIZE_BYTES);
	}

	private normalizeMeta(meta: unknown): Record<string, unknown> | null {
		if (meta === undefined || meta === null) {
			return null;
		}

		if (isObject(meta)) {
			return meta;
		}

		if (Array.isArray(meta)) {
			return {
				items: meta
			};
		}

		return {
			value: meta
		};
	}
}
