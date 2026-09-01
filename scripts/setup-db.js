#!/usr/bin/env node
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from '../backend/migrations/runMigrations.js';
import { dbConfig, initDb, dbQuery, closeDb } from '../backend/src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('====================================================');
  console.log('  EZZ GO — Database Setup & Deployment Helper');
  console.log('====================================================');
  console.log(`Database Dialect : ${dbConfig.dialect?.toUpperCase() || 'MYSQL'}`);
  console.log(`Target Host      : ${dbConfig.host || 'N/A'}`);
  console.log(`Database Name    : ${dbConfig.database || 'N/A'}`);
  console.log(`SSL Enabled      : ${dbConfig.ssl ? 'YES' : 'NO'}`);
  console.log('----------------------------------------------------');

  const pool = await initDb();
  if (!pool) {
    console.error('❌ Failed to connect to the database.');
    console.error('Please verify your DATABASE_URL in environment or .env file.');
    process.exit(1);
  }

  console.log('✅ Connection established successfully!');
  console.log('🚀 Running schema migrations and MRT-6 seed data...');

  try {
    const result = await runMigrations();
    console.log(`✅ Migrations completed: ${JSON.stringify(result)}`);

    // Verify seeded data
    const nodes = await dbQuery('SELECT COUNT(*) as count FROM nodes');
    const edges = await dbQuery('SELECT COUNT(*) as count FROM edges');
    const users = await dbQuery('SELECT COUNT(*) as count FROM users');

    console.log('----------------------------------------------------');
    console.log('📊 Verification Summary:');
    console.log(` - Transit Nodes (Stations/Stops) : ${nodes[0]?.count || 0}`);
    console.log(` - Transit Edges (Connections)    : ${edges[0]?.count || 0}`);
    console.log(` - Registered Users               : ${users[0]?.count || 0}`);
    console.log('----------------------------------------------------');
    console.log('🎉 Database is fully deployed, seeded, and ready for production!');
  } catch (err) {
    console.error('❌ Error applying migrations:', err.message);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error('Fatal setup error:', err);
  process.exit(1);
});
