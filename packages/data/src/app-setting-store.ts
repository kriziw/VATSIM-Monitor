import type { Pool, RowDataPacket } from "mysql2/promise";
import type { AppSettings } from "@vatsim-monitor/domain";

const MAX_LOG_FILE_SIZE_BYTES = 500 * 1024 * 1024;

interface AppSettingRow extends RowDataPacket {
	setting_key: string;
	setting_value: string;
}

function clampLogSize(value: number): number {
	if (!Number.isFinite(value)) {
		return MAX_LOG_FILE_SIZE_BYTES;
	}

	return Math.min(Math.max(Math.floor(value), 1 * 1024 * 1024), MAX_LOG_FILE_SIZE_BYTES);
}

export class AppSettingStore {
	constructor(private readonly pool: Pool) {}

	public async getSettings(): Promise<AppSettings> {
		const [rows] = await this.pool.execute<AppSettingRow[]>(
			`SELECT setting_key, setting_value
			 FROM app_settings
			 WHERE setting_key IN ('log_max_file_size_bytes')`
		);

		const valueByKey = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
		return {
			logMaxFileSizeBytes: clampLogSize(Number(valueByKey.get("log_max_file_size_bytes") || MAX_LOG_FILE_SIZE_BYTES))
		};
	}

	public async updateSettings(update: { logMaxFileSizeBytes?: number }): Promise<AppSettings> {
		if (typeof update.logMaxFileSizeBytes === "number") {
			const value = String(clampLogSize(update.logMaxFileSizeBytes));
			await this.pool.execute(
				`INSERT INTO app_settings (setting_key, setting_value)
				 VALUES ('log_max_file_size_bytes', ?)
				 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
				[value]
			);
		}

		return this.getSettings();
	}
}
