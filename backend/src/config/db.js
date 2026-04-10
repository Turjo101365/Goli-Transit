import { createPool } from 'mysql2/promise';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { createHttpError } from '../utils/http-error.js';

export const dbConfig = {
	enabled: env.DB_ENABLED,
	host: env.DB_HOST,
	port: env.DB_PORT,
	user: env.DB_USER,
	password: env.DB_PASSWORD,
	database: env.DB_NAME,
	connectionLimit: env.DB_POOL_SIZE
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

	const [rows] = await activePool.query(sql, params);
	return rows;
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
