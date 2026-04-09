CREATE TABLE IF NOT EXISTS nodes (
	id VARCHAR(64) PRIMARY KEY,
	metadata JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
	CONSTRAINT fk_edges_to_node FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

CREATE INDEX idx_edges_from_node ON edges (from_node_id);
CREATE INDEX idx_edges_to_node ON edges (to_node_id);
CREATE INDEX idx_edges_mode ON edges (mode);

CREATE TABLE IF NOT EXISTS anomalies (
	id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
	type VARCHAR(64) NOT NULL,
	reason VARCHAR(255) NOT NULL,
	starts_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	expires_at TIMESTAMP NULL,
	status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
	payload JSON NULL,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (id)
);

CREATE INDEX idx_anomalies_status ON anomalies (status);
CREATE INDEX idx_anomalies_expires_at ON anomalies (expires_at);
CREATE INDEX idx_anomalies_created_at ON anomalies (created_at);

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
		ON DELETE CASCADE
);

CREATE INDEX idx_anomaly_edges_anomaly_id ON anomaly_edges (anomaly_id);

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