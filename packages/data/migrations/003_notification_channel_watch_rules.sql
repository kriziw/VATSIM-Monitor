CREATE TABLE notification_channel_watch_rules (
  channel_id CHAR(36) NOT NULL,
  watch_rule_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel_id, watch_rule_id),
  KEY notification_channel_watch_rules_watch_rule_idx (watch_rule_id),
  CONSTRAINT notification_channel_watch_rules_channel_fk FOREIGN KEY (channel_id) REFERENCES notification_channels (id) ON DELETE CASCADE,
  CONSTRAINT notification_channel_watch_rules_watch_rule_fk FOREIGN KEY (watch_rule_id) REFERENCES watch_rules (id) ON DELETE CASCADE
);

INSERT INTO notification_channel_watch_rules (channel_id, watch_rule_id)
SELECT nc.id, wr.id
FROM notification_channels nc
INNER JOIN watch_rules wr ON wr.user_id = nc.user_id;
