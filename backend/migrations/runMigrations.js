import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isSqlMigration(fileName) {
  return /^\d+.*\.sql$/i.test(fileName);
}

async function ensureMigrationsTable(connection) {
  await connection.query(
    [
      'CREATE TABLE IF NOT EXISTS migrations (',
      'id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,',
      'name VARCHAR(255) NOT NULL,',
      'executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,',
      'PRIMARY KEY (id),',
      'UNIQUE KEY uq_migrations_name (name)',
      ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
    ].join(' ')
  );
}

async function getExecutedMigrations(connection) {
  const [rows] = await connection.query('SELECT name FROM migrations');
  return new Set(rows.map((row) => row.name));
}

async function getMigrationFiles() {
  const files = await fs.readdir(__dirname);
  return files.filter(isSqlMigration).sort((a, b) => a.localeCompare(b));
}

async function runSingleMigration(connection, migrationName, sql) {
  await connection.beginTransaction();
  try {
    await connection.query(sql);
    await connection.query('INSERT INTO migrations (name) VALUES (?)', [migrationName]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export async function runMigrations() {
  if (!dbConfig.enabled) {
    console.log('Migrations skipped because DB_ENABLED is false');
    return { applied: 0, skipped: 0 };
  }

  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    multipleStatements: true,
    ...(dbConfig.ssl ? { ssl: dbConfig.ssl } : {})
  });

  try {
    await ensureMigrationsTable(connection);

    const [migrationFiles, executedMigrations] = await Promise.all([
      getMigrationFiles(),
      getExecutedMigrations(connection)
    ]);

    let applied = 0;
    let skipped = 0;

    for (const migrationName of migrationFiles) {
      if (executedMigrations.has(migrationName)) {
        skipped += 1;
        continue;
      }

      const migrationPath = path.resolve(__dirname, migrationName);
      const sql = await fs.readFile(migrationPath, 'utf8');
      await runSingleMigration(connection, migrationName, sql);
      applied += 1;
      console.log(`Applied migration: ${migrationName}`);
    }

    console.log(`Migration run complete (applied=${applied}, skipped=${skipped})`);
    return { applied, skipped };
  } finally {
    await connection.end();
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  runMigrations().catch((error) => {
    console.error('Migration run failed:', error.message);
    process.exit(1);
  });
}
