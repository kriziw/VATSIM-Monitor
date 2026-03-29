import type { Pool, RowDataPacket } from "mysql2/promise";

export interface RoutedDiscordTarget {
	userId: string;
	pattern: string;
	topdown: boolean;
	channelId: string;
	channelDisplayName: string | null;
	destination: string;
}

interface RoutedDiscordTargetRow extends RowDataPacket {
	user_id: string;
	pattern: string;
	topdown: number;
	channel_id: string;
	channel_display_name: string | null;
	destination: string;
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
				nc.destination
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
			destination: row.destination
		}));
	}
}
