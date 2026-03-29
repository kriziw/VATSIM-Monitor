import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import type { NotificationChannel, NotificationChannelType } from "@vatsim-monitor/domain";

interface NotificationChannelRow extends RowDataPacket {
	id: string;
	user_id: string;
	type: NotificationChannelType;
	display_name: string | null;
	destination: string;
	is_active: number;
	created_at: Date;
}

function mapNotificationChannel(row: NotificationChannelRow): NotificationChannel {
	return {
		id: row.id,
		userId: row.user_id,
		type: row.type,
		displayName: row.display_name,
		destination: row.destination,
		isActive: row.is_active === 1,
		createdAt: row.created_at.toISOString()
	};
}

export interface CreateNotificationChannelInput {
	userId: string;
	type: NotificationChannelType;
	displayName: string | null;
	destination: string;
}

export interface UpdateNotificationChannelInput {
	id: string;
	userId: string;
	displayName?: string | null;
	isActive?: boolean;
}

export class NotificationChannelStore {
	constructor(private readonly pool: Pool) {}

	public async listForUser(userId: string): Promise<NotificationChannel[]> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, is_active, created_at
			 FROM notification_channels
			 WHERE user_id = ?
			 ORDER BY created_at DESC, type ASC`,
			[userId]
		);

		return rows.map(mapNotificationChannel);
	}

	public async create(input: CreateNotificationChannelInput): Promise<NotificationChannel> {
		const id = randomUUID();
		await this.pool.execute(
			`INSERT INTO notification_channels (id, user_id, type, display_name, destination, is_active)
			 VALUES (?, ?, ?, ?, ?, TRUE)`,
			[id, input.userId, input.type, input.displayName, input.destination]
		);

		const created = await this.getById(id, input.userId);
		if (!created) {
			throw new Error("Notification channel was created but could not be reloaded.");
		}

		return created;
	}

	public async getById(id: string, userId: string): Promise<NotificationChannel | null> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, is_active, created_at
			 FROM notification_channels
			 WHERE id = ? AND user_id = ?
			 LIMIT 1`,
			[id, userId]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapNotificationChannel(rows[0]);
	}

	public async update(input: UpdateNotificationChannelInput): Promise<NotificationChannel | null> {
		const updates: string[] = [];
		const values: Array<string | boolean | null> = [];

		if (Object.prototype.hasOwnProperty.call(input, "displayName")) {
			updates.push("display_name = ?");
			values.push(input.displayName ?? null);
		}

		if (typeof input.isActive === "boolean") {
			updates.push("is_active = ?");
			values.push(input.isActive);
		}

		if (updates.length === 0) {
			return this.getById(input.id, input.userId);
		}

		values.push(input.id, input.userId);
		await this.pool.execute(
			`UPDATE notification_channels
			 SET ${updates.join(", ")}
			 WHERE id = ? AND user_id = ?`,
			values
		);

		return this.getById(input.id, input.userId);
	}

	public async delete(id: string, userId: string): Promise<void> {
		await this.pool.execute("DELETE FROM notification_channels WHERE id = ? AND user_id = ?", [id, userId]);
	}
}
