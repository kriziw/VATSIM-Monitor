import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { AuthenticatedSession } from "@vatsim-monitor/domain";
import { AuthStore } from "@vatsim-monitor/data";

export interface RegisterInput {
	username: string;
	email: string | null;
	password: string;
}

export interface LoginInput {
	identifier: string;
	password: string;
}

export class AuthError extends Error {
	constructor(message: string, public readonly status: number) {
		super(message);
	}
}

function normalizeUsername(username: string): string {
	return username.trim().toLowerCase();
}

function normalizeEmail(email: string | null): string | null {
	if (!email) {
		return null;
	}

	const trimmed = email.trim().toLowerCase();
	return trimmed.length > 0 ? trimmed : null;
}

function isValidEmailAddress(email: string): boolean {
	if (email.length > 254 || email.includes(" ")) {
		return false;
	}

	const atIndex = email.indexOf("@");
	if (atIndex <= 0 || atIndex !== email.lastIndexOf("@") || atIndex === email.length - 1) {
		return false;
	}

	const localPart = email.slice(0, atIndex);
	const domain = email.slice(atIndex + 1);
	if (localPart.length === 0 || domain.length < 3) {
		return false;
	}

	if (domain.startsWith(".") || domain.endsWith(".")) {
		return false;
	}

	const domainParts = domain.split(".");
	if (domainParts.length < 2) {
		return false;
	}

	return domainParts.every((part) => part.length > 0);
}

function hashPassword(password: string, salt: string): string {
	return scryptSync(password, salt, 64).toString("hex");
}

function formatStoredPassword(password: string): string {
	const salt = randomUUID().replace(/-/g, "");
	const hash = hashPassword(password, salt);
	return `scrypt$${salt}$${hash}`;
}

function verifyStoredPassword(password: string, stored: string): boolean {
	const [algorithm, salt, hash] = stored.split("$");
	if (algorithm !== "scrypt" || !salt || !hash) {
		return false;
	}

	const derived = Buffer.from(hashPassword(password, salt), "hex");
	const existing = Buffer.from(hash, "hex");
	if (derived.length !== existing.length) {
		return false;
	}

	return timingSafeEqual(derived, existing);
}

export class AuthService {
	constructor(
		private readonly authStore: AuthStore,
		private readonly sessionTtlDays = 30
	) {}

	public async register(input: RegisterInput) {
		const username = normalizeUsername(input.username);
		const email = normalizeEmail(input.email);
		const password = input.password;

		if (username.length < 3 || username.length > 64) {
			throw new AuthError("Username must be between 3 and 64 characters.", 400);
		}

		if (!/^[a-z0-9._-]+$/.test(username)) {
			throw new AuthError("Username may only contain letters, numbers, dots, underscores, and hyphens.", 400);
		}

		if (email && !isValidEmailAddress(email)) {
			throw new AuthError("Email address is not valid.", 400);
		}

		if (password.length < 8) {
			throw new AuthError("Password must be at least 8 characters.", 400);
		}

		if (await this.authStore.findUserByUsername(username)) {
			throw new AuthError("That username is already in use.", 409);
		}

		if (email && (await this.authStore.findUserByEmail(email))) {
			throw new AuthError("That email address is already in use.", 409);
		}

		const user = await this.authStore.createUser({
			username,
			email,
			passwordHash: formatStoredPassword(password)
		});
		const session = await this.authStore.createSession(user.id, this.sessionTtlDays);

		return { user, session };
	}

	public async login(input: LoginInput) {
		const identifier = input.identifier.trim();
		if (identifier.length === 0) {
			throw new AuthError("Username or email is required.", 400);
		}

		if (input.password.length === 0) {
			throw new AuthError("Password is required.", 400);
		}

		const user = await this.authStore.findUserByIdentifier(identifier);
		if (!user || !verifyStoredPassword(input.password, user.passwordHash)) {
			throw new AuthError("Invalid credentials.", 401);
		}

		const session = await this.authStore.createSession(user.id, this.sessionTtlDays);
		return {
			user: {
				id: user.id,
				username: user.username,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt
			},
			session
		};
	}

	public async getAuthenticatedSession(sessionId: string): Promise<AuthenticatedSession | null> {
		if (!sessionId) {
			return null;
		}

		return this.authStore.getAuthenticatedSession(sessionId);
	}

	public async logout(sessionId: string): Promise<void> {
		if (!sessionId) {
			return;
		}

		await this.authStore.deleteSession(sessionId);
	}

	public async cleanupExpiredSessions(): Promise<void> {
		await this.authStore.deleteExpiredSessions();
	}
}
