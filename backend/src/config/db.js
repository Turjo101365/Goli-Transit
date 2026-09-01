import { createPool } from 'mysql2/promise';
import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { createHttpError } from '../utils/http-error.js';

const { Pool: PgPool } = pg;

function parseDatabaseUrl(databaseUrl) {
	if (!databaseUrl) {
		return null;
	}

	try {
		const parsed = new URL(databaseUrl);
		if (!parsed.hostname) {
			return null;
		}

		const rawProtocol = parsed.protocol.replace(':', '').toLowerCase();
		let dialect = 'mysql';
		if (rawProtocol.startsWith('postgres') || rawProtocol.startsWith('pg')) {
			dialect = 'postgres';
		} else if (rawProtocol.startsWith('mysql')) {
			dialect = 'mysql';
		} else {
			return null;
		}

		const databaseName = parsed.pathname?.replace(/^\//, '') || '';
		const sslParam = parsed.searchParams.get('ssl') || parsed.searchParams.get('sslmode');
		const useSsl = sslParam === 'true' || sslParam === 'require' || sslParam === 'prefer' || parsed.searchParams.get('ssl-mode') === 'REQUIRED' || dialect === 'postgres';

		return {
			dialect,
			host: parsed.hostname,
			port: Number(parsed.port) || (dialect === 'postgres' ? 5432 : 3306),
			user: decodeURIComponent(parsed.username || ''),
			password: decodeURIComponent(parsed.password || ''),
			database: decodeURIComponent(databaseName),
			ssl: useSsl ? { rejectUnauthorized: false } : undefined,
			connectionString: databaseUrl
		};
	} catch {
		return null;
	}
}

const parsedDbUrl = parseDatabaseUrl(env.DATABASE_URL);

export const dbConfig = {
  enabled: env.DB_ENABLED === true || env.DB_ENABLED === 'true',
  dialect: parsedDbUrl?.dialect || (env.DATABASE_URL?.startsWith('postgres') ? 'postgres' : 'mysql'),

  host: parsedDbUrl?.host || env.DB_HOST || '127.0.0.1',
  port: Number(parsedDbUrl?.port || env.DB_PORT) || 3306,

  user: parsedDbUrl?.user || env.DB_USER || 'root',
  password: parsedDbUrl?.password || env.DB_PASSWORD || '',
  database: parsedDbUrl?.database || env.DB_NAME || 'GoliTransitDB',
  ssl: parsedDbUrl?.ssl || (env.DB_SSL ? { rejectUnauthorized: false } : undefined),
  connectionString: parsedDbUrl?.connectionString || env.DATABASE_URL || '',

  connectionLimit: Number(env.DB_POOL_SIZE) || 4
};

let pool = null;
let status = {
	initialized: false,
	connected: false,
	dialect: dbConfig.dialect,
	enabled: dbConfig.enabled,
	reason: dbConfig.enabled ? 'pending' : 'disabled'
};

export async function initDb() {
	if (!dbConfig.enabled) {
		status = {
			initialized: true,
			connected: false,
			dialect: dbConfig.dialect,
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
		if (dbConfig.dialect === 'postgres') {
			candidatePool = new PgPool({
				connectionString: dbConfig.connectionString || `postgresql://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
				ssl: dbConfig.ssl || { rejectUnauthorized: false },
				max: dbConfig.connectionLimit
			});

			await candidatePool.query('SELECT 1');
			pool = candidatePool;
			status = {
				initialized: true,
				connected: true,
				dialect: 'postgres',
				enabled: true,
				reason: 'connected'
			};
			logger.info('PostgreSQL (Supabase/Render) connected successfully');
			return pool;
		}

		candidatePool = createPool({
			host: dbConfig.host,
			port: dbConfig.port,
			user: dbConfig.user,
			password: dbConfig.password,
			database: dbConfig.database,
			connectionLimit: dbConfig.connectionLimit,
			waitForConnections: true,
			queueLimit: 0,
			namedPlaceholders: true,
			...(dbConfig.ssl ? { ssl: dbConfig.ssl } : {})
		});

		await candidatePool.query('SELECT 1');

		pool = candidatePool;
		status = {
			initialized: true,
			connected: true,
			dialect: 'mysql',
			enabled: true,
			reason: 'connected'
		};
		logger.info('MySQL connected successfully');
		return pool;
	} catch (error) {
		if (candidatePool) {
			if (dbConfig.dialect === 'postgres') {
				await candidatePool.end().catch(() => {});
			} else {
				await candidatePool.end().catch(() => {});
			}
		}

		status = {
			initialized: true,
			connected: false,
			dialect: dbConfig.dialect,
			enabled: true,
			reason: 'connection_failed'
		};
		logger.warn(`${dbConfig.dialect === 'postgres' ? 'PostgreSQL' : 'MySQL'} unavailable, continuing without DB persistence`, {
			message: error.message
		});
		pool = null;
		return null;
	}
}

function transformNamedParamsToPg(sql, params = {}) {
	if (!params || Array.isArray(params) || typeof params !== 'object') {
		return { sql, values: params || [] };
	}

	const values = [];
	let transformedSql = sql.replace(/:([a-zA-Z0-9_]+)/g, (_match, key) => {
		if (key in params) {
			values.push(params[key]);
			return `$${values.length}`;
		}
		return _match;
	});

	// For INSERT queries on Postgres without RETURNING, append RETURNING id
	const isInsert = /^\s*INSERT\s+INTO/i.test(transformedSql);
	if (isInsert && !/RETURNING/i.test(transformedSql)) {
		transformedSql += ' RETURNING id';
	}

	return { sql: transformedSql, values };
}

export async function dbQuery(sql, params = {}) {
	const activePool = pool || (await initDb());
	if (!activePool) {
		return [];
	}

	try {
		if (dbConfig.dialect === 'postgres') {
			const { sql: pgSql, values } = transformNamedParamsToPg(sql, params);
			const result = await activePool.query(pgSql, values);

			if (Array.isArray(result.rows)) {
				// Attach insertId for compatibility with MySQL consumers
				const rows = result.rows;
				if (result.command === 'INSERT') {
					rows.insertId = rows[0]?.id || null;
					rows.affectedRows = result.rowCount;
				} else if (result.command === 'UPDATE' || result.command === 'DELETE') {
					rows.affectedRows = result.rowCount;
				}
				return rows;
			}
			return result.rows || [];
		}

		const [rows] = await activePool.query(sql, params);
		return rows;
	} catch (error) {
		if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === '42P01') {
			throw createHttpError(
				503,
				'DB_SCHEMA_MISSING',
				'Database schema is not initialized. Run `npm run migrate` or `npm run db:setup` and try again.',
				{ sqlMessage: error.sqlMessage || error.message }
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

	try {
		if (dbConfig.dialect === 'postgres') {
			const { rows } = await activePool.query(
				"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
			);
			const presentTables = new Set(rows.map((r) => r.table_name?.toLowerCase()));
			return tableNames.every((t) => presentTables.has(t.toLowerCase()));
		}

		const [rows] = await activePool.query(
			[
				'SELECT TABLE_NAME',
				'FROM INFORMATION_SCHEMA.TABLES',
				'WHERE TABLE_SCHEMA = :databaseName'
			].join(' '),
			{ databaseName: dbConfig.database }
		);

		const presentTables = new Set(rows.map((row) => (row.TABLE_NAME || row.table_name)?.toLowerCase()));
		return tableNames.every((tableName) => presentTables.has(tableName.toLowerCase()));
	} catch {
		return false;
	}
}

export async function ensureDbAvailable() {
	const activePool = pool || (await initDb());

	if (!activePool) {
		throw createHttpError(
			503,
			'DB_UNAVAILABLE',
			'Database connection is currently unavailable. Check your DATABASE_URL settings and try again.'
		);
	}

	return activePool;
}

export function getDbStatus() {
	return { ...status };
}

export async function closeDb() {
	if (pool) {
		await pool.end().catch(() => {});
		pool = null;
	}
}

