-- =========================
-- DATABASE
-- =========================
CREATE DATABASE IF NOT EXISTS GoliTransitDB;
USE GoliTransitDB;

-- =========================
-- USERS
-- =========================
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_users_email (email),
    INDEX idx_users_created_at (created_at)
);

-- =========================
-- PASSWORD RESET TOKENS
-- =========================
CREATE TABLE password_reset_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_password_reset_tokens_hash (token_hash),
    INDEX idx_password_reset_tokens_user_id (user_id),
    INDEX idx_password_reset_tokens_expires_at (expires_at),
    INDEX idx_password_reset_tokens_consumed_at (consumed_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- NODES
-- =========================
DROP TABLE IF EXISTS edges;
DROP TABLE IF EXISTS nodes;

CREATE TABLE nodes (
    id VARCHAR(64) PRIMARY KEY,
    metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- EDGES
-- =========================
CREATE TABLE edges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    from_node_id VARCHAR(64) NOT NULL,
    to_node_id VARCHAR(64) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    base_weight DECIMAL(10,2) NOT NULL,
    current_weight DECIMAL(10,2) NOT NULL,
    allowed_vehicles JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX uq_edges_from_to_mode (from_node_id, to_node_id, mode),
    INDEX idx_edges_from_node (from_node_id),
    INDEX idx_edges_to_node (to_node_id),
    INDEX idx_edges_mode (mode),
    FOREIGN KEY (from_node_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- =========================
-- USER TRIPS
-- =========================
DROP TABLE IF EXISTS trips;

CREATE TABLE trips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    mode VARCHAR(20),
    distance_km DECIMAL(10,2),
    duration_minutes INT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trips_user_id (user_id),
    INDEX idx_trips_completed_at (completed_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- SAVED ROUTES
-- =========================
DROP TABLE IF EXISTS saved_routes;

CREATE TABLE saved_routes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    from_location VARCHAR(255) NOT NULL,
    to_location VARCHAR(255) NOT NULL,
    mode VARCHAR(20),
    duration_minutes INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_saved_routes_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- FAVORITE STOPS
-- =========================
DROP TABLE IF EXISTS favorite_stops;

CREATE TABLE favorite_stops (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    node_id VARCHAR(64),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_favorite_stops_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================
-- ANOMALIES
-- =========================
DROP TABLE IF EXISTS anomaly_edges;
DROP TABLE IF EXISTS anomalies;

CREATE TABLE anomalies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(64) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    starts_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    payload JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_anomalies_status (status),
    INDEX idx_anomalies_expires_at (expires_at),
    INDEX idx_anomalies_created_at (created_at)
);

-- =========================
-- ANOMALY EDGES
-- =========================
CREATE TABLE anomaly_edges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    anomaly_id BIGINT NOT NULL,
    from_node_id VARCHAR(64) NOT NULL,
    to_node_id VARCHAR(64) NOT NULL,
    mode VARCHAR(20) NOT NULL,
    multiplier DECIMAL(10,2) NOT NULL,
    updated_weight DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_anomaly_edges_anomaly_id (anomaly_id),
    FOREIGN KEY (anomaly_id) REFERENCES anomalies(id) ON DELETE CASCADE,
    FOREIGN KEY (from_node_id, to_node_id, mode) 
        REFERENCES edges(from_node_id, to_node_id, mode) ON DELETE CASCADE
);