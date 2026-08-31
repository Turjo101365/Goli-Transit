import 'dotenv/config';
import mysql from 'mysql2/promise';
import { dbConfig } from '../src/config/db.js';

const VALID_TABLES = [
  'users',
  'nodes',
  'edges',
  'corridors',
  'corridor_observations',
  'trips',
  'saved_routes',
  'favorite_stops',
  'anomalies',
  'anomaly_edges',
  'migrations',
  'password_reset_tokens'
];

async function getConnection() {
  const ports = [dbConfig.port, 3306, 3308].filter(Boolean);
  let lastError = null;

  for (const port of ports) {
    try {
      const connection = await mysql.createConnection({
        host: dbConfig.host || '127.0.0.1',
        port: Number(port),
        user: dbConfig.user || 'root',
        password: dbConfig.password || 'root123',
        database: dbConfig.database || 'GoliTransitDB'
      });
      return connection;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Failed to connect to MySQL database '${dbConfig.database}': ${lastError?.message}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  \x1b[1;36m${title}\x1b[0m`);
  console.log('='.repeat(60));
}

async function showAllTablesSummary(conn) {
  printHeader(`DATABASE OVERVIEW: ${dbConfig.database}`);

  const [tables] = await conn.query('SHOW TABLES');
  if (tables.length === 0) {
    console.log('\n  \x1b[33mNo tables found. Run `npm run migrate` to initialize tables.\x1b[0m\n');
    return;
  }

  const summary = [];

  for (const tObj of tables) {
    const tableName = Object.values(tObj)[0];
    const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
    const count = countResult[0].count;

    summary.push({
      'Table Name': tableName,
      'Total Rows': count,
      'Quick Command': `node scripts/view-db.js ${tableName}`
    });
  }

  console.table(summary);
  console.log('\n💡 \x1b[32mTip:\x1b[0m To view data of a specific table, run:');
  console.log('   \x1b[33mnode scripts/view-db.js <table_name> [limit]\x1b[0m');
  console.log('   Example: \x1b[33mnode scripts/view-db.js nodes\x1b[0m\n');
}

async function showTableData(conn, tableName, limit = 50) {
  const [tables] = await conn.query('SHOW TABLES');
  const existingTables = tables.map(t => Object.values(t)[0]);

  const matchedTable = existingTables.find(t => t.toLowerCase() === tableName.toLowerCase());
  if (!matchedTable) {
    console.log(`\n❌ \x1b[31mTable '${tableName}' does not exist.\x1b[0m Available tables:`);
    console.log(existingTables.map(t => `  - ${t}`).join('\n'));
    return;
  }

  const [countResult] = await conn.query(`SELECT COUNT(*) as count FROM \`${matchedTable}\``);
  const totalRows = countResult[0].count;

  printHeader(`TABLE: ${matchedTable} (Total Rows: ${totalRows})`);

  if (totalRows === 0) {
    console.log(`\n  \x1b[33mTable '${matchedTable}' is currently empty (0 rows).\x1b[0m\n`);
    return;
  }

  let selectQuery = `SELECT * FROM \`${matchedTable}\` LIMIT ${Number(limit)}`;
  if (matchedTable === 'users') {
    // Hide password hashes for cleaner output
    selectQuery = `SELECT id, name, email, created_at, updated_at FROM \`users\` LIMIT ${Number(limit)}`;
  }

  const [rows] = await conn.query(selectQuery);
  console.table(rows);

  if (totalRows > limit) {
    console.log(`\nShowing first ${limit} of ${totalRows} rows. Run with a higher limit if needed:`);
    console.log(`  \x1b[33mnode scripts/view-db.js ${matchedTable} ${totalRows}\x1b[0m\n`);
  }
}

async function runCustomSql(conn, sql) {
  printHeader(`CUSTOM QUERY: ${sql}`);
  try {
    const [rows] = await conn.query(sql);
    if (Array.isArray(rows)) {
      console.table(rows);
      console.log(`\n(${rows.length} rows returned)\n`);
    } else {
      console.log('Result:', rows);
    }
  } catch (err) {
    console.error(`❌ Query error: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  let conn;

  try {
    conn = await getConnection();
  } catch (err) {
    console.error('\n❌ \x1b[31mDatabase Connection Error:\x1b[0m', err.message);
    console.log('\nMake sure your MySQL server is running (e.g. docker container `mysql-db` or `docker compose up -d`).\n');
    process.exit(1);
  }

  try {
    if (args.length === 0) {
      await showAllTablesSummary(conn);
    } else if (args[0] === '--sql' && args[1]) {
      await runCustomSql(conn, args.slice(1).join(' '));
    } else {
      const tableName = args[0];
      const limit = args[1] ? parseInt(args[1], 10) : 50;
      await showTableData(conn, tableName, limit);
    }
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
