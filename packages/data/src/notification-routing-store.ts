import type { Pool, RowDataPacket } from "mysql2/promise";
import {
	getDefaultDiscordNotificationConfig,
	type DiscordNotificationChannelConfig
} from "@vatsim-monitor/domain";

export interface RoutedDiscordTarget {
	userId: string;
	pattern: string;
	topdown: boolean;
	channelId: string;
	channelDisplayName: string | null;
	destination: string;
	config: DiscordNotificationChannelConfig;
}

interface RoutedDiscordTargetRow extends RowDataPacket {
	user_id: string;
	pattern: string;
	topdown: number;
	channel_id: string;
	channel_display_name: string | null;
	destination: string;
	config_json: unknown;
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

export class NotificationRoutingStore {
	constructor(private readonly pool: Pool) {}

	public async listActiveDiscordTargets(): Promise<RoutedDiscordTarget[]> {
		const [rows] = await this.pool.execute<RoutedDiscordTargetRow[]>(
			`SELECT
				wr.user_id,
				wr.pattern,
				wr.topdown,
				nc.id AS channel_id,
				nc.display_name AS channel_display_name,
				nc.destination,
				nc.config_json
			 FROM watch_rules wr
			 INNER JOIN notification_channels nc ON nc.user_id = wr.user_id
			 WHERE wr.is_active = TRUE
			   AND nc.is_active = TRUE
			   AND nc.type = 'discord_webhook'`
		);

		return rows.map((row) => ({
			userId: row.user_id,
			pattern: row.pattern,
			topdown: row.topdown === 1,
			channelId: row.channel_id,
			channelDisplayName: row.channel_display_name,
			destination: row.destination,
			config: parseDiscordConfig(row.config_json)
		}));
	}
}
