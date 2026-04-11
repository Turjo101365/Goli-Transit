import 'dotenv/config';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

async function seedDatabase() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true
  });

  try {
    await connection.query(`
      INSERT INTO nodes (id, metadata) VALUES
      ('A', '{"name": "Station A", "lat": 40.7128, "lon": -74.0060}'),
      ('B', '{"name": "Station B", "lat": 40.7580, "lon": -73.9855}'),
      ('C', '{"name": "Station C", "lat": 40.7829, "lon": -73.9654}'),
      ('D', '{"name": "Station D", "lat": 40.7489, "lon": -73.9680}')
    `);

    await connection.query(`
      INSERT INTO edges (from_node_id, to_node_id, mode, base_weight, current_weight, allowed_vehicles) VALUES
      ('A', 'B', 'walk', 6, 6, '["pedestrian", "bicycle"]'),
      ('B', 'C', 'bus', 4, 4, '["bus", "car"]'),
      ('A', 'D', 'bike', 7, 7, '["bicycle", "pedestrian"]'),
      ('D', 'C', 'metro', 3, 3, '["metro", "car", "pedestrian"]'),
      ('B', 'D', 'walk', 2, 2, '["pedestrian"]')
    `);

    console.log('Seed data inserted successfully');
  } finally {
    await connection.end();
  }
}

seedDatabase().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});