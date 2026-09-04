-- Migration 007: Create user_activities table for tracking commuter actions

CREATE TABLE IF NOT EXISTS user_activities (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  activity_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_activities_user_id (user_id),
  KEY idx_user_activities_type (activity_type),
  KEY idx_user_activities_created_at (created_at),
  CONSTRAINT fk_user_activities_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
