import type { Pool, RowDataPacket } from "mysql2/promise";
import type { UserPreferences } from "@vatsim-monitor/domain";

interface UserPreferenceRow extends RowDataPacket {
	user_id: string;
	logs_enabled: number;
}

function mapUserPreferences(row: UserPreferenceRow | null, userId: string): UserPreferences {
	return {
		userId,
		logsEnabled: row?.logs_enabled === 1
	};
}

export class UserPreferenceStore {
	constructor(private readonly pool: Pool) {}

	public async getForUser(userId: string): Promise<UserPreferences> {
		const [rows] = await this.pool.execute<UserPreferenceRow[]>(
			`SELECT user_id, logs_enabled
			 FROM user_preferences
			 WHERE user_id = ?
			 LIMIT 1`,
			[userId]
		);

		return mapUserPreferences(rows[0] ?? null, userId);
	}

	public async update(userId: string, update: { logsEnabled?: boolean }): Promise<UserPreferences> {
		await this.pool.execute(
			`INSERT INTO user_preferences (user_id, logs_enabled)
			 VALUES (?, ?)
			 ON DUPLICATE KEY UPDATE
			 logs_enabled = COALESCE(VALUES(logs_enabled), logs_enabled)`,
			[userId, typeof update.logsEnabled === "boolean" ? update.logsEnabled : 0]
		);

		return this.getForUser(userId);
	}
}
