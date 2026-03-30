ALTER TABLE controller_events
  MODIFY event_type ENUM('controller_online', 'controller_offline', 'controller_change') NOT NULL;
