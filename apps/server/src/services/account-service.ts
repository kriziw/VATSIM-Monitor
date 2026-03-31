import {
	coerceDiscordNotificationConfig,
	getDefaultDiscordNotificationTemplate,
	getDefaultDiscordNotificationConfig,
	type DiscordNotificationTemplate,
	type DiscordNotificationTemplateType,
	type DiscordNotificationChannelConfig,
	type NotificationChannel,
	type NotificationChannelType,
	type WatchRule
} from "@vatsim-monitor/domain";
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

function normalizeHexColor(color: string | null | undefined): string | null {
	if (!color || color.trim().length === 0) {
		return null;
	}

	const normalized = color.trim().startsWith("#") ? color.trim() : `#${color.trim()}`;
	if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
		throw new AccountError("Discord embed colour must be a 6-digit hex value.", 400);
	}

	return normalized.toUpperCase();
}

function normalizeTemplateField(
	value: string | null | undefined,
	field: string,
	maxLength: number,
	allowEmpty = false
): string | null {
	const normalized = value?.trim() ?? "";
	if (!allowEmpty && normalized.length === 0) {
		throw new AccountError(`${field} is required.`, 400);
	}

	if (normalized.length > maxLength) {
		throw new AccountError(`${field} must be ${maxLength} characters or fewer.`, 400);
	}

	if (allowEmpty && normalized.length === 0) {
		return null;
	}

	return normalized;
}

function normalizeDiscordTemplate(
	template: Partial<DiscordNotificationTemplate> | undefined,
	type: DiscordNotificationTemplateType,
	label: string
): DiscordNotificationTemplate {
	const defaults = getDefaultDiscordNotificationTemplate(type);

	return {
		titleTemplate:
			normalizeTemplateField(template?.titleTemplate ?? defaults.titleTemplate, `${label} title`, 256) ??
			defaults.titleTemplate,
		descriptionTemplate:
			normalizeTemplateField(
				template?.descriptionTemplate ?? defaults.descriptionTemplate,
				`${label} description`,
				4000
			) ?? defaults.descriptionTemplate,
		contentTemplate: normalizeTemplateField(template?.contentTemplate ?? null, `${label} content`, 2000, true),
		color: normalizeHexColor(template?.color ?? defaults.color)
	};
}

function normalizeDiscordConfig(
	input?: Partial<DiscordNotificationChannelConfig> | null
): DiscordNotificationChannelConfig {
	const config = coerceDiscordNotificationConfig(input ?? getDefaultDiscordNotificationConfig());
	return {
		controllerOnline: normalizeDiscordTemplate(config.controllerOnline, "controllerOnline", "Controller online"),
		controllerOffline: normalizeDiscordTemplate(config.controllerOffline, "controllerOffline", "Controller offline"),
		controllerChange: normalizeDiscordTemplate(config.controllerChange, "controllerChange", "Controller change")
	};
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
		input: {
			type: NotificationChannelType;
			destination: string;
			displayName: string | null;
			config?: Partial<DiscordNotificationChannelConfig> | null;
		}
	): Promise<NotificationChannel> {
		if (input.type !== "discord_webhook") {
			throw new AccountError("Only Discord webhook channels are supported in this slice.", 400);
		}

		const destination = input.destination.trim();
		validateDiscordWebhook(destination);
		const existingChannel = await this.notificationChannelStore.getByDestination(userId, destination);
		if (existingChannel) {
			throw new AccountError("That Discord webhook is already configured for this account.", 409);
		}

		return this.notificationChannelStore.create({
			userId,
			type: input.type,
			destination,
			displayName: input.displayName?.trim() || null,
			config: normalizeDiscordConfig(input.config)
		});
	}

	public async updateNotificationChannel(
		userId: string,
		id: string,
		update: {
			displayName?: string | null;
			destination?: string;
			config?: Partial<DiscordNotificationChannelConfig> | null;
			isActive?: boolean;
		}
	): Promise<NotificationChannel> {
		if (typeof update.destination === "string") {
			const normalizedDestination = update.destination.trim();
			validateDiscordWebhook(normalizedDestination);

			const existingChannel = await this.notificationChannelStore.getByDestination(userId, normalizedDestination);
			if (existingChannel && existingChannel.id !== id) {
				throw new AccountError("That Discord webhook is already configured for this account.", 409);
			}
		}

		const channel = await this.notificationChannelStore.update({
			id,
			userId,
			displayName: update.displayName,
			destination: typeof update.destination === "string" ? update.destination.trim() : undefined,
			config: Object.prototype.hasOwnProperty.call(update, "config")
				? normalizeDiscordConfig(update.config)
				: undefined,
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
