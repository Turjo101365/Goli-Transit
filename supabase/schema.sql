-- =========================================================
-- EZZ GO: Supabase (PostgreSQL) Initial Schema & Seed
-- Run this script inside Supabase Dashboard -> SQL Editor
-- =========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_consumed_at ON password_reset_tokens(consumed_at);

-- 3. Nodes Table (Stations, Stops, Landmarks)
CREATE TABLE IF NOT EXISTS nodes (
  id VARCHAR(64) PRIMARY KEY,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  lat NUMERIC(10,7) NOT NULL,
  lng NUMERIC(10,7) NOT NULL,
  type VARCHAR(32) NOT NULL CHECK (type IN ('metro_station', 'bus_stop', 'landmark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Edges Table (Connections between nodes)
CREATE TABLE IF NOT EXISTS edges (
  id BIGSERIAL PRIMARY KEY,
  from_node VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL,
  base_minutes INT NOT NULL,
  fare_taka INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_edges_from_to_mode UNIQUE (from_node, to_node, mode)
);

CREATE INDEX IF NOT EXISTS idx_edges_from_node ON edges(from_node);
CREATE INDEX IF NOT EXISTS idx_edges_to_node ON edges(to_node);
CREATE INDEX IF NOT EXISTS idx_edges_mode ON edges(mode);

-- 5. Corridors Table
CREATE TABLE IF NOT EXISTS corridors (
  id VARCHAR(64) PRIMARY KEY,
  name_bn VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  polyline JSONB NOT NULL,
  length_m INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Trips Table
CREATE TABLE IF NOT EXISTS trips (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NULL,
  distance_km NUMERIC(10,2) NULL,
  duration_minutes INT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_completed_at ON trips(completed_at);

-- 7. Saved Routes Table
CREATE TABLE IF NOT EXISTS saved_routes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NULL,
  duration_minutes INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- 8. Favorite Stops Table
CREATE TABLE IF NOT EXISTS favorite_stops (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  node_id VARCHAR(64) NULL,
  latitude NUMERIC(10,8) NULL,
  longitude NUMERIC(11,8) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_favorite_stops_user_id ON favorite_stops(user_id);

-- 9. Anomalies Table
CREATE TABLE IF NOT EXISTS anomalies (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_anomalies_status ON anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_expires_at ON anomalies(expires_at);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at);

-- 10. Anomaly Edges Table
CREATE TABLE IF NOT EXISTS anomaly_edges (
  id BIGSERIAL PRIMARY KEY,
  anomaly_id BIGINT NOT NULL REFERENCES anomalies(id) ON DELETE CASCADE,
  from_node VARCHAR(64) NOT NULL,
  to_node VARCHAR(64) NOT NULL,
  mode VARCHAR(20) NOT NULL,
  multiplier NUMERIC(10,2) NOT NULL,
  updated_weight NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_anomaly_edges_edge
    FOREIGN KEY (from_node, to_node, mode)
    REFERENCES edges(from_node, to_node, mode) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anomaly_edges_anomaly_id ON anomaly_edges(anomaly_id);

-- 11. Corridor Observations Table
CREATE TABLE IF NOT EXISTS corridor_observations (
  id BIGSERIAL PRIMARY KEY,
  corridor_id VARCHAR(64) NOT NULL REFERENCES corridors(id) ON DELETE CASCADE,
  observed_at TIMESTAMPTZ NOT NULL,
  current_speed_kmh NUMERIC(6,2) NOT NULL,
  freeflow_kmh NUMERIC(6,2) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_corridor_observations_corridor_id ON corridor_observations(corridor_id);
CREATE INDEX IF NOT EXISTS idx_corridor_observations_observed_at ON corridor_observations(observed_at);

-- 12. Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SEED DATA: Dhaka MRT-6 Metro Stations and Connecting Edges
-- =========================================================

INSERT INTO nodes (id, name_bn, name_en, lat, lng, type) VALUES
  ('mrt_uttara_north', 'উত্তরা উত্তর', 'Uttara North', 23.8694, 90.3675, 'metro_station'),
  ('mrt_uttara_center', 'উত্তরা সেন্টার', 'Uttara Center', 23.8598, 90.3651, 'metro_station'),
  ('mrt_uttara_south', 'উত্তরা দক্ষিণ', 'Uttara South', 23.8456, 90.3631, 'metro_station'),
  ('mrt_pallabi', 'পল্লবী', 'Pallabi', 23.8262, 90.3642, 'metro_station'),
  ('mrt_mirpur_11', 'মিরপুর ১১', 'Mirpur 11', 23.8191, 90.3653, 'metro_station'),
  ('mrt_mirpur_10', 'মিরপুর ১০', 'Mirpur 10', 23.8084, 90.3682, 'metro_station'),
  ('mrt_kazipara', 'কাজীপাড়া', 'Kazipara', 23.7992, 90.3720, 'metro_station'),
  ('mrt_shewrapara', 'শেওড়াপাড়া', 'Shewrapara', 23.7909, 90.3755, 'metro_station'),
  ('mrt_agargaon', 'আগারগাঁও', 'Agargaon', 23.7777, 90.3802, 'metro_station'),
  ('mrt_bijoy_sarani', 'বিজয় সরণি', 'Bijoy Sarani', 23.7664, 90.3763, 'metro_station'),
  ('mrt_farmgate', 'ফার্মগেট', 'Farmgate', 23.7602, 90.3865, 'metro_station'),
  ('mrt_karwan_bazar', 'কাওরান বাজার', 'Karwan Bazar', 23.7513, 90.3927, 'metro_station'),
  ('mrt_shahbagh', 'শাহবাগ', 'Shahbagh', 23.7395, 90.3960, 'metro_station'),
  ('mrt_dhaka_university', 'ঢাকা বিশ্ববিদ্যালয়', 'Dhaka University', 23.7319, 90.3965, 'metro_station'),
  ('mrt_secretariat', 'বাংলাদেশ সচিবালয়', 'Bangladesh Secretariat', 23.7300, 90.4075, 'metro_station'),
  ('mrt_motijheel', 'মতিঝিল', 'Motijheel', 23.7281, 90.4191, 'metro_station')
ON CONFLICT (id) DO NOTHING;

INSERT INTO edges (from_node, to_node, mode, base_minutes, fare_taka) VALUES
  ('mrt_uttara_north', 'mrt_uttara_center', 'metro', 2, 20),
  ('mrt_uttara_center', 'mrt_uttara_north', 'metro', 2, 20),
  ('mrt_uttara_center', 'mrt_uttara_south', 'metro', 2, 0),
  ('mrt_uttara_south', 'mrt_uttara_center', 'metro', 2, 0),
  ('mrt_uttara_south', 'mrt_pallabi', 'metro', 3, 10),
  ('mrt_pallabi', 'mrt_uttara_south', 'metro', 3, 10),
  ('mrt_pallabi', 'mrt_mirpur_11', 'metro', 2, 0),
  ('mrt_mirpur_11', 'mrt_pallabi', 'metro', 2, 0),
  ('mrt_mirpur_11', 'mrt_mirpur_10', 'metro', 2, 10),
  ('mrt_mirpur_10', 'mrt_mirpur_11', 'metro', 2, 10),
  ('mrt_mirpur_10', 'mrt_kazipara', 'metro', 2, 0),
  ('mrt_kazipara', 'mrt_mirpur_10', 'metro', 2, 0),
  ('mrt_kazipara', 'mrt_shewrapara', 'metro', 2, 10),
  ('mrt_shewrapara', 'mrt_kazipara', 'metro', 2, 10),
  ('mrt_shewrapara', 'mrt_agargaon', 'metro', 3, 0),
  ('mrt_agargaon', 'mrt_shewrapara', 'metro', 3, 0),
  ('mrt_agargaon', 'mrt_bijoy_sarani', 'metro', 3, 10),
  ('mrt_bijoy_sarani', 'mrt_agargaon', 'metro', 3, 10),
  ('mrt_bijoy_sarani', 'mrt_farmgate', 'metro', 3, 10),
  ('mrt_farmgate', 'mrt_bijoy_sarani', 'metro', 3, 10),
  ('mrt_farmgate', 'mrt_karwan_bazar', 'metro', 2, 10),
  ('mrt_karwan_bazar', 'mrt_farmgate', 'metro', 2, 10),
  ('mrt_karwan_bazar', 'mrt_shahbagh', 'metro', 3, 0),
  ('mrt_shahbagh', 'mrt_karwan_bazar', 'metro', 3, 0),
  ('mrt_shahbagh', 'mrt_dhaka_university', 'metro', 2, 10),
  ('mrt_dhaka_university', 'mrt_shahbagh', 'metro', 2, 10),
  ('mrt_dhaka_university', 'mrt_secretariat', 'metro', 3, 0),
  ('mrt_secretariat', 'mrt_dhaka_university', 'metro', 3, 0),
  ('mrt_secretariat', 'mrt_motijheel', 'metro', 3, 10),
  ('mrt_motijheel', 'mrt_secretariat', 'metro', 3, 10)
ON CONFLICT (from_node, to_node, mode) DO NOTHING;
