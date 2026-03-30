import { randomUUID } from "node:crypto";
import type { ControllerEvent, ControllerEventType } from "@vatsim-monitor/domain";
import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface ControllerEventRow extends RowDataPacket {
	id: string;
	event_type: ControllerEventType;
	source: string;
	controller_cid: number;
	callsign: string;
	frequency: string;
	occurred_at: Date;
	created_at: Date;
}

export interface CreateControllerEventInput {
	type: ControllerEventType;
	source: string;
	controllerCid: number;
	callsign: string;
	frequency: string;
	payloadJson?: string | null;
	dedupeKey: string;
	occurredAt: Date;
}

function mapControllerEvent(row: ControllerEventRow): ControllerEvent {
	return {
		id: row.id,
		type: row.event_type,
		controllerCid: Number(row.controller_cid),
		callsign: row.callsign,
		frequency: row.frequency,
		source: row.source,
		occurredAt: row.occurred_at.toISOString(),
		createdAt: row.created_at.toISOString()
	};
}

export class ControllerEventStore {
	constructor(private readonly pool: Pool) {}

	public async create(input: CreateControllerEventInput): Promise<ControllerEvent> {
		const id = randomUUID();
		await this.pool.execute<ResultSetHeader>(
			`INSERT INTO controller_events (id, event_type, source, controller_cid, callsign, frequency, payload_json, dedupe_key, occurred_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				input.type,
				input.source,
				input.controllerCid,
				input.callsign,
				input.frequency,
				input.payloadJson ?? null,
				input.dedupeKey,
				input.occurredAt
			]
		);

		const created = await this.getById(id);
		if (!created) {
			throw new Error("Controller event was created but could not be reloaded.");
		}

		return created;
	}

	public async getById(id: string): Promise<ControllerEvent | null> {
		const [rows] = await this.pool.execute<ControllerEventRow[]>(
			`SELECT id, event_type, source, controller_cid, callsign, frequency, occurred_at, created_at
			 FROM controller_events
			 WHERE id = ?
			 LIMIT 1`,
			[id]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapControllerEvent(rows[0]);
	}

	public async listRecent(limit = 20, offset = 0): Promise<ControllerEvent[]> {
		const safeLimit = Math.max(1, Math.min(100, limit));
		const safeOffset = Math.max(0, offset);
		const [rows] = await this.pool.execute<ControllerEventRow[]>(
			`SELECT id, event_type, source, controller_cid, callsign, frequency, occurred_at, created_at
			 FROM controller_events
			 ORDER BY occurred_at DESC
			 LIMIT ${safeLimit} OFFSET ${safeOffset}`
		);

		return rows.map(mapControllerEvent);
	}
}
