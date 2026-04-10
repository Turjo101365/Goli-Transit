CREATE DATABASE IF NOT EXISTS __DB_NAME__ CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE __DB_NAME__;

CREATE TABLE IF NOT EXISTS users (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	name VARCHAR(120) NOT NULL,
	email VARCHAR(191) NOT NULL,
	password_hash VARCHAR(255) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	CONSTRAINT uq_users_email UNIQUE (email),
	KEY idx_users_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	user_id BIGINT UNSIGNED NOT NULL,
	token_hash CHAR(64) NOT NULL,
	expires_at TIMESTAMP NOT NULL,
	consumed_at TIMESTAMP NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
	CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
	KEY idx_password_reset_tokens_user_id (user_id),
	KEY idx_password_reset_tokens_expires_at (expires_at),
	KEY idx_password_reset_tokens_consumed_at (consumed_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS nodes (
	id VARCHAR(64) PRIMARY KEY,
	metadata JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS edges (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	from_node_id VARCHAR(64) NOT NULL,
	to_node_id VARCHAR(64) NOT NULL,
	mode ENUM('walk', 'bike', 'bus', 'metro') NOT NULL,
	base_weight DECIMAL(10,2) NOT NULL,
	current_weight DECIMAL(10,2) NOT NULL,
	allowed_vehicles JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	CONSTRAINT uq_edges_from_to_mode UNIQUE (from_node_id, to_node_id, mode),
	CONSTRAINT fk_edges_from_node FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
	CONSTRAINT fk_edges_to_node FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
	KEY idx_edges_from_node (from_node_id),
	KEY idx_edges_to_node (to_node_id),
	KEY idx_edges_mode (mode)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anomalies (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	type VARCHAR(64) NOT NULL,
	reason VARCHAR(255) NOT NULL,
	starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMP NULL,
	status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
	payload JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	KEY idx_anomalies_status (status),
	KEY idx_anomalies_expires_at (expires_at),
	KEY idx_anomalies_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anomaly_edges (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	anomaly_id BIGINT UNSIGNED NOT NULL,
	from_node_id VARCHAR(64) NOT NULL,
	to_node_id VARCHAR(64) NOT NULL,
	mode ENUM('walk', 'bike', 'bus', 'metro') NOT NULL,
	multiplier DECIMAL(10,2) NOT NULL,
	updated_weight DECIMAL(10,2) NOT NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id),
	CONSTRAINT fk_anomaly_edges_anomaly FOREIGN KEY (anomaly_id) REFERENCES anomalies(id) ON DELETE CASCADE,
	CONSTRAINT fk_anomaly_edges_edge FOREIGN KEY (from_node_id, to_node_id, mode)
		REFERENCES edges(from_node_id, to_node_id, mode)
		ON DELETE CASCADE,
	KEY idx_anomaly_edges_anomaly_id (anomaly_id)
) ENGINE=InnoDB;

INSERT INTO nodes (id, metadata)
VALUES
	('A', JSON_OBJECT()),
	('B', JSON_OBJECT()),
	('C', JSON_OBJECT()),
	('D', JSON_OBJECT())
ON DUPLICATE KEY UPDATE metadata = VALUES(metadata);

INSERT INTO edges (from_node_id, to_node_id, mode, base_weight, current_weight, allowed_vehicles)
VALUES
	('A', 'B', 'walk', 6.00, 6.00, JSON_ARRAY('pedestrian', 'bicycle')),
	('B', 'C', 'bus', 4.00, 4.00, JSON_ARRAY('bus', 'car')),
	('A', 'D', 'bike', 7.00, 7.00, JSON_ARRAY('bicycle', 'pedestrian')),
	('D', 'C', 'metro', 3.00, 3.00, JSON_ARRAY('metro', 'car', 'pedestrian')),
	('B', 'D', 'walk', 2.00, 2.00, JSON_ARRAY('pedestrian'))
ON DUPLICATE KEY UPDATE
	base_weight = VALUES(base_weight),
	current_weight = VALUES(current_weight),
	allowed_vehicles = VALUES(allowed_vehicles);
