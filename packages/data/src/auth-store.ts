import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, RowDataPacket } from "mysql2/promise";
import type { AuthenticatedSession, Session, User, UserRole } from "@vatsim-monitor/domain";

interface UserRow extends RowDataPacket {
	id: string;
	username: string;
	email: string | null;
	password_hash: string;
	role: UserRole;
	created_at: Date;
}

interface SessionRow extends RowDataPacket {
	id: string;
	user_id: string;
	expires_at: Date;
}

interface SessionUserRow extends RowDataPacket {
	session_id: string;
	session_user_id: string;
	session_expires_at: Date;
	user_id: string;
	username: string;
	email: string | null;
	role: UserRole;
	created_at: Date;
}

export interface CreateUserInput {
	username: string;
	email: string | null;
	passwordHash: string;
	role?: UserRole;
}

function mapUser(row: Pick<UserRow, "id" | "username" | "email" | "role" | "created_at">): User {
	return {
		id: row.id,
		username: row.username,
		email: row.email,
		role: row.role,
		createdAt: row.created_at.toISOString()
	};
}

export class AuthStore {
	constructor(private readonly pool: Pool) {}

	public async findUserByIdentifier(identifier: string): Promise<(User & { passwordHash: string }) | null> {
		const normalized = identifier.trim().toLowerCase();
		const [rows] = await this.pool.execute<UserRow[]>(
			`SELECT id, username, email, password_hash, role, created_at
			 FROM users
			 WHERE LOWER(username) = ? OR LOWER(COALESCE(email, '')) = ?
			 LIMIT 1`,
			[normalized, normalized]
		);

		if (rows.length === 0) {
			return null;
		}

		const row = rows[0];
		return {
			...mapUser(row),
			passwordHash: row.password_hash
		};
	}

	public async findUserByUsername(username: string): Promise<User | null> {
		const [rows] = await this.pool.execute<UserRow[]>(
			`SELECT id, username, email, password_hash, role, created_at
			 FROM users
			 WHERE LOWER(username) = ?
			 LIMIT 1`,
			[username.trim().toLowerCase()]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapUser(rows[0]);
	}

	public async findUserByEmail(email: string): Promise<User | null> {
		const normalized = email.trim().toLowerCase();
		const [rows] = await this.pool.execute<UserRow[]>(
			`SELECT id, username, email, password_hash, role, created_at
			 FROM users
			 WHERE LOWER(email) = ?
			 LIMIT 1`,
			[normalized]
		);

		if (rows.length === 0) {
			return null;
		}

		return mapUser(rows[0]);
	}

	public async createUser(input: CreateUserInput): Promise<User> {
		const id = randomUUID();
		const role = input.role ?? "user";
		await this.pool.execute(
			`INSERT INTO users (id, username, email, password_hash, role)
			 VALUES (?, ?, ?, ?, ?)`,
			[id, input.username, input.email, input.passwordHash, role]
		);

		return {
			id,
			username: input.username,
			email: input.email,
			role,
			createdAt: new Date().toISOString()
		};
	}

	public async createSession(userId: string, ttlDays: number): Promise<Session> {
		const id = randomBytes(32).toString("hex");
		const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

		await this.pool.execute(
			`INSERT INTO sessions (id, user_id, expires_at)
			 VALUES (?, ?, ?)`,
			[id, userId, expiresAt]
		);

		return {
			id,
			userId,
			expiresAt: expiresAt.toISOString()
		};
	}

	public async getAuthenticatedSession(sessionId: string): Promise<AuthenticatedSession | null> {
		const [rows] = await this.pool.execute<SessionUserRow[]>(
			`SELECT
				s.id AS session_id,
				s.user_id AS session_user_id,
				s.expires_at AS session_expires_at,
				u.id AS user_id,
				u.username,
				u.email,
				u.role,
				u.created_at
			 FROM sessions s
			 INNER JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP()
			 LIMIT 1`,
			[sessionId]
		);

		if (rows.length === 0) {
			return null;
		}

		const row = rows[0];
		return {
			session: {
				id: row.session_id,
				userId: row.session_user_id,
				expiresAt: row.session_expires_at.toISOString()
			},
			user: {
				id: row.user_id,
				username: row.username,
				email: row.email,
				role: row.role,
				createdAt: row.created_at.toISOString()
			}
		};
	}

	public async deleteSession(sessionId: string): Promise<void> {
		await this.pool.execute("DELETE FROM sessions WHERE id = ?", [sessionId]);
	}

	public async deleteExpiredSessions(): Promise<void> {
		await this.pool.execute("DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()");
	}
}
