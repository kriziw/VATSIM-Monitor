import { randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import type { WatchRule } from "@vatsim-monitor/domain";

interface WatchRuleRow extends RowDataPacket {
	id: string;
	user_id: string;
	pattern: string;
	topdown: number;
	is_active: number;
	created_at: Date;
}

function mapWatchRule(row: WatchRuleRow): WatchRule {
	return {
		id: row.id,
		userId: row.user_id,
		pattern: row.pattern,
		topdown: row.topdown === 1,
		isActive: row.is_active === 1,
		createdAt: row.created_at.toISOString()
	};
}

export interface CreateWatchRuleInput {
	userId: string;
	pattern: string;
	topdown: boolean;
}

export interface UpdateWatchRuleInput {
	id: string;
	userId: string;
	topdown?: boolean;
	isActive?: boolean;
}

export class WatchRuleStore {
	constructor(private readonly pool: Pool) {}

	public async listForUser(userId: string): Promise<WatchRule[]> {
		const [rows] = await this.pool.execute<WatchRuleRow[]>(
			`SELECT id, user_id, pattern, topdown, is_active, created_at
			 FROM watch_rules
			 WHERE user_id = ?
			 ORDER BY created_at DESC, pattern ASC`,
			[userId]
		);

		return rows.map(mapWatchRule);
	}

	public async create(input: CreateWatchRuleInput): Promise<WatchRule> {
		const id = randomUUID();
		await this.pool.execute(
			`INSERT INTO watch_rules (id, user_id, pattern, topdown, is_active)
			 VALUES (?, ?, ?, ?, TRUE)`,
			[id, input.userId, input.pattern, input.topdown]
		);

		const created = await this.getById(id, input.userId);
		if (!created) {
			throw new Error("Watch rule was created but could not be reloaded.");
		}

		return created;
	}

	public async getById(id: string, userId: string): Promise<WatchRule | null> {
		const [rows] = await this.pool.execute<WatchRuleRow[]>(
			`SELECT id, user_id, pattern, topdown, is_active, created_at
			 FROM watch_rules
			 WHERE id = ? AND user_id = ?
			 LIMIT 1`,
			[id, userId]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapWatchRule(rows[0]);
	}

	public async update(input: UpdateWatchRuleInput): Promise<WatchRule | null> {
		const updates: string[] = [];
		const values: Array<string | boolean> = [];

		if (typeof input.topdown === "boolean") {
			updates.push("topdown = ?");
			values.push(input.topdown);
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
			`UPDATE watch_rules
			 SET ${updates.join(", ")}
			 WHERE id = ? AND user_id = ?`,
			values
		);

		return this.getById(input.id, input.userId);
	}

	public async delete(id: string, userId: string): Promise<void> {
		await this.pool.execute("DELETE FROM watch_rules WHERE id = ? AND user_id = ?", [id, userId]);
	}
}
