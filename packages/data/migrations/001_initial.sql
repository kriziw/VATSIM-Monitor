CREATE TABLE users (
  id CHAR(36) NOT NULL,
  username VARCHAR(64) NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY users_username_uq (username),
  UNIQUE KEY users_email_uq (email)
);

CREATE TABLE sessions (
  id CHAR(64) NOT NULL,
  user_id CHAR(36) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY sessions_user_id_idx (user_id),
  CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE linked_accounts (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  provider ENUM('local', 'vatsim') NOT NULL,
  provider_account_id VARCHAR(128) NOT NULL,
  display_name VARCHAR(255) NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  token_expires_at DATETIME NULL,
  metadata_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY linked_accounts_provider_account_uq (provider, provider_account_id),
  KEY linked_accounts_user_id_idx (user_id),
  CONSTRAINT linked_accounts_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE watch_rules (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  pattern VARCHAR(32) NOT NULL,
  topdown BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY watch_rules_user_id_idx (user_id),
  UNIQUE KEY watch_rules_user_pattern_uq (user_id, pattern),
  CONSTRAINT watch_rules_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE notification_channels (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  type ENUM('discord_webhook', 'web_push') NOT NULL,
  display_name VARCHAR(120) NULL,
  destination TEXT NOT NULL,
  config_json JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notification_channels_user_id_idx (user_id),
  CONSTRAINT notification_channels_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE ignored_controller_ids (
  vatsim_cid BIGINT NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vatsim_cid)
);

CREATE TABLE controller_snapshots (
  id BIGINT NOT NULL AUTO_INCREMENT,
  source VARCHAR(32) NOT NULL,
  controller_cid BIGINT NOT NULL,
  callsign VARCHAR(32) NOT NULL,
  frequency VARCHAR(16) NOT NULL,
  controller_name VARCHAR(255) NOT NULL,
  observed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY controller_snapshots_callsign_idx (callsign),
  KEY controller_snapshots_controller_cid_idx (controller_cid),
  KEY controller_snapshots_observed_at_idx (observed_at)
);

CREATE TABLE controller_events (
  id CHAR(36) NOT NULL,
  event_type ENUM('controller_online', 'controller_offline', 'controller_change') NOT NULL,
  source VARCHAR(32) NOT NULL,
  controller_cid BIGINT NOT NULL,
  callsign VARCHAR(32) NOT NULL,
  frequency VARCHAR(16) NOT NULL,
  payload_json JSON NULL,
  dedupe_key VARCHAR(191) NOT NULL,
  occurred_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY controller_events_dedupe_uq (dedupe_key),
  KEY controller_events_callsign_idx (callsign),
  KEY controller_events_occurred_at_idx (occurred_at)
);

CREATE TABLE notification_deliveries (
  id CHAR(36) NOT NULL,
  event_id CHAR(36) NOT NULL,
  channel_id CHAR(36) NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  error_text TEXT NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notification_deliveries_event_id_idx (event_id),
  KEY notification_deliveries_channel_id_idx (channel_id),
  CONSTRAINT notification_deliveries_event_fk FOREIGN KEY (event_id) REFERENCES controller_events (id) ON DELETE CASCADE,
  CONSTRAINT notification_deliveries_channel_fk FOREIGN KEY (channel_id) REFERENCES notification_channels (id) ON DELETE CASCADE
);

