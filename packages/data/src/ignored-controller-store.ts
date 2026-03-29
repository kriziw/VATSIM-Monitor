import type { Pool, RowDataPacket } from "mysql2/promise";

interface IgnoredControllerRow extends RowDataPacket {
	vatsim_cid: number;
}

export class IgnoredControllerStore {
	constructor(private readonly pool: Pool) {}

	public async listIgnoredControllerIds(): Promise<Set<number>> {
		const [rows] = await this.pool.execute<IgnoredControllerRow[]>(
			"SELECT vatsim_cid FROM ignored_controller_ids"
		);

		return new Set(rows.map((row) => Number(row.vatsim_cid)));
	}
}
