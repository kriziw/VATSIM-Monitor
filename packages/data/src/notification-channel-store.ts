import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import {
	getDefaultDiscordNotificationConfig,
	type DiscordNotificationChannelConfig,
	type NotificationChannel,
	type NotificationChannelType
} from "@vatsim-monitor/domain";

interface NotificationChannelRow extends RowDataPacket {
	id: string;
	user_id: string;
	type: NotificationChannelType;
	display_name: string | null;
	destination: string;
	config_json: unknown;
	is_active: number;
	created_at: Date;
}

function parseDiscordConfig(raw: unknown): DiscordNotificationChannelConfig {
	const defaults = getDefaultDiscordNotificationConfig();
	let parsed: unknown = {};

	try {
		parsed = typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : {};
	} catch {
		parsed = {};
	}

	const config = parsed as Partial<DiscordNotificationChannelConfig>;

	return {
		titleTemplate:
			typeof config.titleTemplate === "string" && config.titleTemplate.trim().length > 0
				? config.titleTemplate
				: defaults.titleTemplate,
		descriptionTemplate:
			typeof config.descriptionTemplate === "string" && config.descriptionTemplate.trim().length > 0
				? config.descriptionTemplate
				: defaults.descriptionTemplate,
		contentTemplate:
			typeof config.contentTemplate === "string" && config.contentTemplate.trim().length > 0
				? config.contentTemplate
				: null,
		color:
			typeof config.color === "string" && config.color.trim().length > 0
				? config.color.toUpperCase()
				: null
	};
}

function mapNotificationChannel(row: NotificationChannelRow): NotificationChannel {
	return {
		id: row.id,
		userId: row.user_id,
		type: row.type,
		displayName: row.display_name,
		destination: row.destination,
		config: row.type === "discord_webhook" ? parseDiscordConfig(row.config_json) : null,
		isActive: row.is_active === 1,
		createdAt: row.created_at.toISOString()
	};
}

export interface CreateNotificationChannelInput {
	userId: string;
	type: NotificationChannelType;
	displayName: string | null;
	destination: string;
	config?: DiscordNotificationChannelConfig | null;
}

export interface UpdateNotificationChannelInput {
	id: string;
	userId: string;
	displayName?: string | null;
	destination?: string;
	config?: DiscordNotificationChannelConfig | null;
	isActive?: boolean;
}

export class NotificationChannelStore {
	constructor(private readonly pool: Pool) {}

	public async listForUser(userId: string): Promise<NotificationChannel[]> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, config_json, is_active, created_at
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
			`INSERT INTO notification_channels (id, user_id, type, display_name, destination, config_json, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
			[
				id,
				input.userId,
				input.type,
				input.displayName,
				input.destination,
				input.config ? JSON.stringify(input.config) : null
			]
		);

		const created = await this.getById(id, input.userId);
		if (!created) {
			throw new Error("Notification channel was created but could not be reloaded.");
		}

		return created;
	}

	public async getById(id: string, userId: string): Promise<NotificationChannel | null> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, config_json, is_active, created_at
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

		if (typeof input.destination === "string") {
			updates.push("destination = ?");
			values.push(input.destination);
		}

		if (Object.prototype.hasOwnProperty.call(input, "config")) {
			updates.push("config_json = ?");
			values.push(input.config ? JSON.stringify(input.config) : null);
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
