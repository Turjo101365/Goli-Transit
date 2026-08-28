CREATE TABLE IF NOT EXISTS corridor_observations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  corridor_id VARCHAR(64) NOT NULL,
  observed_at DATETIME NOT NULL,
  current_speed_kmh DECIMAL(6,2) NOT NULL,
  freeflow_kmh DECIMAL(6,2) NOT NULL,
  confidence DECIMAL(4,3) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_corridor_observations_corridor_id (corridor_id),
  KEY idx_corridor_observations_observed_at (observed_at),
  CONSTRAINT fk_corridor_observations_corridor
    FOREIGN KEY (corridor_id) REFERENCES corridors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
