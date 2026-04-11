import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';
import { hashPassword } from '../src/utils/password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration() {
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  const rawSql = await fs.readFile(schemaPath, 'utf8');
  const databaseName = `\`${env.DB_NAME.replaceAll('`', '``')}\``;
  const sql = rawSql.replaceAll('__DB_NAME__', databaseName);

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    await connection.query(sql);

    const demoEmail = 'demo@goli-transit.local';
    const demoPassword = 'DemoPass123!';
    const demoPasswordHash = hashPassword(demoPassword);

    await connection.query(
      [
        'INSERT INTO users (name, email, password_hash)',
        'VALUES (?, ?, ?)'
      ].join(' '),
      ['Demo User', demoEmail, demoPasswordHash]
    );

    console.log(
      `Migration completed for database ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT} using ${schemaPath}`
    );
    console.log(`Seeded demo login: ${demoEmail} / ${demoPassword}`);
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigration().catch((error) => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
}
