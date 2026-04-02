import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import {
	coerceDiscordNotificationConfig,
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

interface NotificationChannelWatchRuleRow extends RowDataPacket {
	channel_id: string;
	watch_rule_id: string;
}

function maskDiscordWebhook(destination: string): string {
	const match = destination.match(/^(https:\/\/discord\.com\/api\/webhooks\/)(\d+)\/([A-Za-z0-9_-]+)$/);
	if (!match) {
		return "Stored webhook";
	}

	const [, prefix, id, token] = match;
	const idPreview = id.length > 6 ? `${id.slice(0, 3)}...${id.slice(-3)}` : id;
	const tokenPreview = token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : "****";
	return `${prefix}${idPreview}/${tokenPreview}`;
}

function parseDiscordConfig(raw: unknown): DiscordNotificationChannelConfig {
	try {
		return coerceDiscordNotificationConfig(
			typeof raw === "string" ? JSON.parse(raw) : raw && typeof raw === "object" ? raw : {}
		);
	} catch {
		return coerceDiscordNotificationConfig({});
	}
}

function mapNotificationChannel(
	row: NotificationChannelRow,
	watchRuleIds: string[]
): NotificationChannel {
	return {
		id: row.id,
		userId: row.user_id,
		type: row.type,
		displayName: row.display_name,
		destination: "",
		destinationMasked: maskDiscordWebhook(row.destination),
		config: row.type === "discord_webhook" ? parseDiscordConfig(row.config_json) : null,
		watchRuleIds,
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
	watchRuleIds?: string[];
}

export interface UpdateNotificationChannelInput {
	id: string;
	userId: string;
	displayName?: string | null;
	destination?: string;
	config?: DiscordNotificationChannelConfig | null;
	isActive?: boolean;
	watchRuleIds?: string[];
}

export class NotificationChannelStore {
	constructor(private readonly pool: Pool) {}

	private async listWatchRuleIdsForChannels(channelIds: string[]): Promise<Map<string, string[]>> {
		const watchRuleIdsByChannelId = new Map<string, string[]>();
		for (const channelId of channelIds) {
			watchRuleIdsByChannelId.set(channelId, []);
		}

		if (channelIds.length === 0) {
			return watchRuleIdsByChannelId;
		}

		const placeholders = channelIds.map(() => "?").join(", ");
		const [rows] = await this.pool.execute<NotificationChannelWatchRuleRow[]>(
			`SELECT channel_id, watch_rule_id
			 FROM notification_channel_watch_rules
			 WHERE channel_id IN (${placeholders})
			 ORDER BY channel_id ASC, watch_rule_id ASC`,
			channelIds
		);

		for (const row of rows) {
			const current = watchRuleIdsByChannelId.get(row.channel_id);
			if (current) {
				current.push(row.watch_rule_id);
				continue;
			}

			watchRuleIdsByChannelId.set(row.channel_id, [row.watch_rule_id]);
		}

		return watchRuleIdsByChannelId;
	}

	private async replaceWatchRuleIds(channelId: string, watchRuleIds: string[]): Promise<void> {
		await this.pool.execute("DELETE FROM notification_channel_watch_rules WHERE channel_id = ?", [channelId]);

		if (watchRuleIds.length === 0) {
			return;
		}

		const placeholders = watchRuleIds.map(() => "(?, ?)").join(", ");
		const values = watchRuleIds.flatMap((watchRuleId) => [channelId, watchRuleId]);
		await this.pool.execute(
			`INSERT INTO notification_channel_watch_rules (channel_id, watch_rule_id)
			 VALUES ${placeholders}`,
			values
		);
	}

	public async listForUser(userId: string): Promise<NotificationChannel[]> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, config_json, is_active, created_at
			 FROM notification_channels
			 WHERE user_id = ?
			 ORDER BY created_at DESC, type ASC`,
			[userId]
		);

		const watchRuleIdsByChannelId = await this.listWatchRuleIdsForChannels(rows.map((row) => row.id));
		return rows.map((row) => mapNotificationChannel(row, watchRuleIdsByChannelId.get(row.id) ?? []));
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
		await this.replaceWatchRuleIds(id, input.watchRuleIds ?? []);

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

		const watchRuleIdsByChannelId = await this.listWatchRuleIdsForChannels([rows[0].id]);
		return mapNotificationChannel(rows[0], watchRuleIdsByChannelId.get(rows[0].id) ?? []);
	}

	public async getByDestination(userId: string, destination: string): Promise<NotificationChannel | null> {
		const [rows] = await this.pool.execute<NotificationChannelRow[]>(
			`SELECT id, user_id, type, display_name, destination, config_json, is_active, created_at
			 FROM notification_channels
			 WHERE user_id = ? AND destination = ?
			 LIMIT 1`,
			[userId, destination]
		);

		if (rows.length === 0) {
			return null;
		}

		const watchRuleIdsByChannelId = await this.listWatchRuleIdsForChannels([rows[0].id]);
		return mapNotificationChannel(rows[0], watchRuleIdsByChannelId.get(rows[0].id) ?? []);
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
			if (Array.isArray(input.watchRuleIds)) {
				await this.replaceWatchRuleIds(input.id, input.watchRuleIds);
			}

			return this.getById(input.id, input.userId);
		}

		values.push(input.id, input.userId);
		await this.pool.execute(
			`UPDATE notification_channels
			 SET ${updates.join(", ")}
			 WHERE id = ? AND user_id = ?`,
			values
		);

		if (Array.isArray(input.watchRuleIds)) {
			await this.replaceWatchRuleIds(input.id, input.watchRuleIds);
		}

		return this.getById(input.id, input.userId);
	}

	public async countByWatchRuleId(userId: string, watchRuleId: string): Promise<number> {
		const [rows] = await this.pool.execute<Array<RowDataPacket & { total: number }>>(
			`SELECT COUNT(*) AS total
			 FROM notification_channel_watch_rules ncr
			 INNER JOIN notification_channels nc ON nc.id = ncr.channel_id
			 WHERE ncr.watch_rule_id = ? AND nc.user_id = ?`,
			[watchRuleId, userId]
		);

		return Number(rows[0]?.total ?? 0);
	}

	public async delete(id: string, userId: string): Promise<void> {
		await this.pool.execute("DELETE FROM notification_channels WHERE id = ? AND user_id = ?", [id, userId]);
	}
}
