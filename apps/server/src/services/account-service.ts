import type { NotificationChannel, NotificationChannelType, WatchRule } from "@vatsim-monitor/domain";
import { NotificationChannelStore, WatchRuleStore } from "@vatsim-monitor/data";

export class AccountError extends Error {
	constructor(message: string, public readonly status: number) {
		super(message);
	}
}

function normalizePattern(pattern: string): string {
	return pattern.trim().toUpperCase().replace(/_+/g, "_");
}

function validatePattern(pattern: string): void {
	if (pattern.length < 4 || pattern.length > 32) {
		throw new AccountError("Watch pattern must be between 4 and 32 characters.", 400);
	}

	if (pattern.includes(" ")) {
		throw new AccountError("Watch pattern may not contain spaces.", 400);
	}

	if (pattern.startsWith("%")) {
		throw new AccountError("Watch pattern may not start with a wildcard.", 400);
	}

	if (!/^[A-Z0-9_%]+$/.test(pattern)) {
		throw new AccountError("Watch pattern may only contain letters, numbers, underscores, and wildcards.", 400);
	}
}

function validateDiscordWebhook(destination: string): void {
	if (!/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(destination)) {
		throw new AccountError("Discord webhook URL is not valid.", 400);
	}
}

export class AccountService {
	constructor(
		private readonly watchRuleStore: WatchRuleStore,
		private readonly notificationChannelStore: NotificationChannelStore
	) {}

	public async getDashboardData(userId: string): Promise<{
		watchRules: WatchRule[];
		notificationChannels: NotificationChannel[];
	}> {
		const [watchRules, notificationChannels] = await Promise.all([
			this.watchRuleStore.listForUser(userId),
			this.notificationChannelStore.listForUser(userId)
		]);

		return { watchRules, notificationChannels };
	}

	public async createWatchRule(userId: string, pattern: string, topdown: boolean): Promise<WatchRule> {
		const normalizedPattern = normalizePattern(pattern);
		validatePattern(normalizedPattern);

		try {
			return await this.watchRuleStore.create({
				userId,
				pattern: normalizedPattern,
				topdown
			});
		} catch (error: any) {
			if (error?.code === "ER_DUP_ENTRY") {
				throw new AccountError("That watch rule already exists.", 409);
			}

			throw error;
		}
	}

	public async updateWatchRule(
		userId: string,
		id: string,
		update: { topdown?: boolean; isActive?: boolean }
	): Promise<WatchRule> {
		const watchRule = await this.watchRuleStore.update({
			id,
			userId,
			topdown: update.topdown,
			isActive: update.isActive
		});

		if (!watchRule) {
			throw new AccountError("Watch rule was not found.", 404);
		}

		return watchRule;
	}

	public async deleteWatchRule(userId: string, id: string): Promise<void> {
		const existing = await this.watchRuleStore.getById(id, userId);
		if (!existing) {
			throw new AccountError("Watch rule was not found.", 404);
		}

		await this.watchRuleStore.delete(id, userId);
	}

	public async createNotificationChannel(
		userId: string,
		input: { type: NotificationChannelType; destination: string; displayName: string | null }
	): Promise<NotificationChannel> {
		if (input.type !== "discord_webhook") {
			throw new AccountError("Only Discord webhook channels are supported in this slice.", 400);
		}

		validateDiscordWebhook(input.destination.trim());

		return this.notificationChannelStore.create({
			userId,
			type: input.type,
			destination: input.destination.trim(),
			displayName: input.displayName?.trim() || null
		});
	}

	public async updateNotificationChannel(
		userId: string,
		id: string,
		update: { displayName?: string | null; isActive?: boolean }
	): Promise<NotificationChannel> {
		const channel = await this.notificationChannelStore.update({
			id,
			userId,
			displayName: update.displayName,
			isActive: update.isActive
		});

		if (!channel) {
			throw new AccountError("Notification channel was not found.", 404);
		}

		return channel;
	}

	public async deleteNotificationChannel(userId: string, id: string): Promise<void> {
		const existing = await this.notificationChannelStore.getById(id, userId);
		if (!existing) {
			throw new AccountError("Notification channel was not found.", 404);
		}

		await this.notificationChannelStore.delete(id, userId);
	}
}
