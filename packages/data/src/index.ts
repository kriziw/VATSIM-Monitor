import { createPool, type Pool } from "mysql2/promise";
import { AuthStore } from "./auth-store.js";
import { WatchRuleStore } from "./watch-rule-store.js";
import { NotificationChannelStore } from "./notification-channel-store.js";
import { IgnoredControllerStore } from "./ignored-controller-store.js";
import { NotificationRoutingStore } from "./notification-routing-store.js";
import { ControllerEventStore } from "./controller-event-store.js";
import { NotificationDeliveryStore } from "./notification-delivery-store.js";
import { UserPreferenceStore } from "./user-preference-store.js";
import { AppSettingStore } from "./app-setting-store.js";

export interface MysqlConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
}

export function createMysqlPool(config: MysqlConfig): Pool {
	return createPool({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		database: config.database,
		connectionLimit: 10
	});
}

export { AuthStore };
export type { CreateUserInput } from "./auth-store.js";
export {
	WatchRuleStore,
	NotificationChannelStore,
	IgnoredControllerStore,
	NotificationRoutingStore,
	ControllerEventStore,
	NotificationDeliveryStore,
	UserPreferenceStore,
	AppSettingStore
};
export type { CreateWatchRuleInput, UpdateWatchRuleInput } from "./watch-rule-store.js";
export type {
	CreateNotificationChannelInput,
	UpdateNotificationChannelInput
} from "./notification-channel-store.js";
export type { RoutedDiscordTarget } from "./notification-routing-store.js";
export type { CreateControllerEventInput } from "./controller-event-store.js";
