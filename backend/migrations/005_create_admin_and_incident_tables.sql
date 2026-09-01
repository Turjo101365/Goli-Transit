-- Migration 005: Create Admin, Incident Reports, Audit Logs, and System Settings tables

-- 1. Alter users table to add role, status, last_login_at, phone if they do not exist
SET @dbname = DATABASE();

-- Add role column
SET @tablename = "users";
SET @columnname = "role";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'user' AFTER email"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add status column
SET @columnname = "status";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active' AFTER role"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add last_login_at column
SET @columnname = "last_login_at";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL AFTER status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add phone column
SET @columnname = "phone";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN phone VARCHAR(32) NULL AFTER last_login_at"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 2. Create Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT NOT NULL AUTO_INCREMENT,
  admin_id BIGINT NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_logs_admin_id (admin_id),
  KEY idx_admin_audit_logs_action (action),
  KEY idx_admin_audit_logs_created_at (created_at),
  CONSTRAINT fk_admin_audit_logs_admin
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create Incident Reports Table
CREATE TABLE IF NOT EXISTS incident_reports (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NULL,
  reporter_name VARCHAR(120) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  type ENUM('traffic_jam', 'waterlogging', 'road_block', 'metro_issue', 'accident', 'vip_movement', 'other') NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  lat DECIMAL(10,7) NULL,
  lng DECIMAL(10,7) NULL,
  corridor_id VARCHAR(64) NULL,
  severity ENUM('low', 'moderate', 'severe', 'critical') NOT NULL DEFAULT 'moderate',
  status ENUM('pending', 'verified', 'rejected', 'resolved') NOT NULL DEFAULT 'pending',
  upvotes INT NOT NULL DEFAULT 0,
  verified_by BIGINT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_incident_reports_status (status),
  KEY idx_incident_reports_type (type),
  KEY idx_incident_reports_created_at (created_at),
  CONSTRAINT fk_incident_reports_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_incident_reports_verifier
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
  key_name VARCHAR(64) NOT NULL,
  value_json JSON NOT NULL,
  description VARCHAR(255) NULL,
  updated_by BIGINT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (key_name),
  CONSTRAINT fk_system_settings_updater
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Seed default system settings
INSERT INTO system_settings (key_name, value_json, description)
VALUES
(
  'fare_rules',
  JSON_OBJECT(
    'brta_bus_base_taka', 10,
    'brta_bus_per_km', 2.5,
    'cng_base_taka', 50,
    'cng_per_km', 15.0,
    'rickshaw_base_taka', 25,
    'rickshaw_per_km', 20.0
  ),
  'BRTA & local transit fare calculation parameters'
),
(
  'alert_thresholds',
  JSON_OBJECT(
    'min_saving_minutes', 12,
    'cooldown_minutes', 10,
    'anomaly_multiplier_threshold', 1.4
  ),
  'Commuter departure & route anomaly notification rules'
),
(
  'system_status',
  JSON_OBJECT(
    'maintenance_mode', false,
    'active_broadcast_banner_bn', '',
    'active_broadcast_banner_en', ''
  ),
  'System maintenance state and live broadcast banner message'
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 6. Promote demo user (or create default admin account)
UPDATE users SET role = 'admin' WHERE email = 'demo@ezzgo.local' OR id = 1;

-- Insert default admin account if not exists (password: 'Admin@123')
INSERT INTO users (name, email, role, status, password_hash)
VALUES (
  'System Administrator',
  'admin@ezzgo.com',
  'admin',
  'active',
  '$2a$10$wE1q4B9jYnJ3QoA4Jp4z7.06TqMvh01tNnC3LwFjC5yPj3m/J1uCe'
)
ON DUPLICATE KEY UPDATE role = 'admin';
