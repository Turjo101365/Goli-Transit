import { createPool } from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { createHttpError } from '../utils/http-error.js';

export const dbConfig = {
  enabled: env.DB_ENABLED === true || env.DB_ENABLED === 'true',

  host: env.DB_HOST || '127.0.0.1',
  port: Number(env.DB_PORT) || 3306,

  user: env.DB_USER || 'root',
  password: env.DB_PASSWORD || '',
  database: env.DB_NAME || 'test',

  connectionLimit: Number(env.DB_POOL_SIZE) || 10
};
let pool = null;
let status = {
	initialized: false,
	connected: false,
	enabled: dbConfig.enabled,
	reason: dbConfig.enabled ? 'pending' : 'disabled'
};

export async function initDb() {
	if (!dbConfig.enabled) {
		status = {
			initialized: true,
			connected: false,
			enabled: false,
			reason: 'disabled'
		};
		return null;
	}

	if (pool) {
		return pool;
	}

	if (status.initialized && !status.connected) {
		return null;
	}

	let candidatePool = null;

	try {
		candidatePool = createPool({
			host: dbConfig.host,
			port: dbConfig.port,
			user: dbConfig.user,
			password: dbConfig.password,
			database: dbConfig.database,
			connectionLimit: dbConfig.connectionLimit,
			waitForConnections: true,
			queueLimit: 0,
			namedPlaceholders: true
		});

		const [schemaRows] = await candidatePool.query(
			[
				'SELECT SCHEMA_NAME',
				'FROM INFORMATION_SCHEMA.SCHEMATA',
				'WHERE SCHEMA_NAME = :databaseName',
				'LIMIT 1'
			].join(' '),
			{ databaseName: dbConfig.database }
		);

		if (!schemaRows.length) {
			throw new Error(`Unknown database '${dbConfig.database}'`);
		}

		pool = candidatePool;
		status = {
			initialized: true,
			connected: true,
			enabled: true,
			reason: 'connected'
		};
		logger.info('MySQL connected');
		return pool;
	} catch (error) {
		if (candidatePool) {
			await candidatePool.end().catch(() => {});
		}

		status = {
			initialized: true,
			connected: false,
			enabled: true,
			reason: 'connection_failed'
		};
		logger.warn('MySQL unavailable, continuing without DB persistence', {
			message: error.message
		});
		pool = null;
		return null;
	}
}

export async function dbQuery(sql, params = {}) {
	const activePool = pool || (await initDb());
	if (!activePool) {
		return [];
	}

	try {
		const [rows] = await activePool.query(sql, params);
		return rows;
	} catch (error) {
		if (error?.code === 'ER_NO_SUCH_TABLE') {
			throw createHttpError(
				503,
				'DB_SCHEMA_MISSING',
				'Database schema is not initialized. Run `npm run migrate` and try again.',
				{ sqlMessage: error.sqlMessage }
			);
		}

		throw error;
	}
}

export async function hasTables(tableNames = []) {
	const activePool = pool || (await initDb());

	if (!activePool || tableNames.length === 0) {
		return false;
	}

	const [rows] = await activePool.query(
		[
			'SELECT TABLE_NAME',
			'FROM INFORMATION_SCHEMA.TABLES',
			'WHERE TABLE_SCHEMA = :databaseName'
		].join(' '),
		{ databaseName: dbConfig.database }
	);

	const presentTables = new Set(rows.map((row) => row.TABLE_NAME || row.table_name));
	return tableNames.every((tableName) => presentTables.has(tableName));
}

export async function ensureDbAvailable() {
	const activePool = pool || (await initDb());

	if (!activePool) {
		throw createHttpError(
			503,
			'DB_UNAVAILABLE',
			'Authentication requires a live database connection. Check your MySQL settings and try again.'
		);
	}

	return activePool;
}

export function getDbStatus() {
	return { ...status };
}
