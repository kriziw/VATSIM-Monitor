import { randomUUID } from "node:crypto";
import type { NotificationDelivery } from "@vatsim-monitor/domain";
import type { Pool, RowDataPacket } from "mysql2/promise";

interface NotificationDeliveryRow extends RowDataPacket {
	id: string;
	event_id: string;
	channel_id: string;
	status: "failed" | "pending" | "sent" | "skipped";
	error_text: string | null;
	delivered_at: Date | null;
	created_at: Date;
}

function mapNotificationDelivery(row: NotificationDeliveryRow): NotificationDelivery {
	return {
		id: row.id,
		eventId: row.event_id,
		channelId: row.channel_id,
		status: row.status,
		errorText: row.error_text,
		deliveredAt: row.delivered_at ? row.delivered_at.toISOString() : null,
		createdAt: row.created_at.toISOString()
	};
}

export class NotificationDeliveryStore {
	constructor(private readonly pool: Pool) {}

	public async createPending(eventId: string, channelId: string): Promise<NotificationDelivery> {
		const id = randomUUID();
		await this.pool.execute(
			`INSERT INTO notification_deliveries (id, event_id, channel_id, status)
			 VALUES (?, ?, ?, 'pending')`,
			[id, eventId, channelId]
		);

		return this.getById(id) as Promise<NotificationDelivery>;
	}

	public async markSent(id: string): Promise<void> {
		await this.pool.execute(
			`UPDATE notification_deliveries
			 SET status = 'sent', delivered_at = UTC_TIMESTAMP()
			 WHERE id = ?`,
			[id]
		);
	}

	public async markFailed(id: string, errorText: string): Promise<void> {
		await this.pool.execute(
			`UPDATE notification_deliveries
			 SET status = 'failed', error_text = ?
			 WHERE id = ?`,
			[errorText.slice(0, 4000), id]
		);
	}

	public async markSkipped(id: string, reason: string): Promise<void> {
		await this.pool.execute(
			`UPDATE notification_deliveries
			 SET status = 'skipped', error_text = ?
			 WHERE id = ?`,
			[reason.slice(0, 4000), id]
		);
	}

	public async getById(id: string): Promise<NotificationDelivery | null> {
		const [rows] = await this.pool.execute<NotificationDeliveryRow[]>(
			`SELECT id, event_id, channel_id, status, error_text, delivered_at, created_at
			 FROM notification_deliveries
			 WHERE id = ?
			 LIMIT 1`,
			[id]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapNotificationDelivery(rows[0]);
	}
}
