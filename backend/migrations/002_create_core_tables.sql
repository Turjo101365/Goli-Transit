CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_tokens_hash (token_hash),
  KEY idx_password_reset_tokens_user_id (user_id),
  KEY idx_password_reset_tokens_expires_at (expires_at),
  KEY idx_password_reset_tokens_consumed_at (consumed_at),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nodes (
  id VARCHAR(64) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  lat DECIMAL(10,7) NOT NULL,
  lng DECIMAL(10,7) NOT NULL,
  type ENUM('metro_station','bus_stop','landmark') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS edges (
  id BIGINT NOT NULL AUTO_INCREMENT,
  from_node VARCHAR(64) NOT NULL,
  to_node VARCHAR(64) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  base_minutes INT NOT NULL,
  fare_taka INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_edges_from_to_mode (from_node, to_node, mode),
  KEY idx_edges_from_node (from_node),
  KEY idx_edges_to_node (to_node),
  KEY idx_edges_mode (mode),
  CONSTRAINT fk_edges_from_node
    FOREIGN KEY (from_node) REFERENCES nodes(id) ON DELETE CASCADE,
  CONSTRAINT fk_edges_to_node
    FOREIGN KEY (to_node) REFERENCES nodes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS corridors (
  id VARCHAR(64) NOT NULL,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  polyline JSON NOT NULL,
  length_m INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trips (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NULL,
  distance_km DECIMAL(10,2) NULL,
  duration_minutes INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_trips_user_id (user_id),
  KEY idx_trips_completed_at (completed_at),
  CONSTRAINT fk_trips_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_routes (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(120) NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NULL,
  duration_minutes INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_saved_routes_user_id (user_id),
  CONSTRAINT fk_saved_routes_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS favorite_stops (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  node_id VARCHAR(64) NULL,
  latitude DECIMAL(10,8) NULL,
  longitude DECIMAL(11,8) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_favorite_stops_user_id (user_id),
  CONSTRAINT fk_favorite_stops_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS anomalies (
  id BIGINT NOT NULL AUTO_INCREMENT,
  type VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  payload JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_anomalies_status (status),
  KEY idx_anomalies_expires_at (expires_at),
  KEY idx_anomalies_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS anomaly_edges (
  id BIGINT NOT NULL AUTO_INCREMENT,
  anomaly_id BIGINT NOT NULL,
  from_node VARCHAR(64) NOT NULL,
  to_node VARCHAR(64) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  multiplier DECIMAL(10,2) NOT NULL,
  updated_weight DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_anomaly_edges_anomaly_id (anomaly_id),
  CONSTRAINT fk_anomaly_edges_anomaly
    FOREIGN KEY (anomaly_id) REFERENCES anomalies(id) ON DELETE CASCADE,
  CONSTRAINT fk_anomaly_edges_edge
    FOREIGN KEY (from_node, to_node, mode)
    REFERENCES edges(from_node, to_node, mode) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
