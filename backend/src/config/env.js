function toInt(value, fallback) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
	if (value === undefined) {
		return fallback;
	}

	return value === 'true' || value === '1';
}

export const env = {
	NODE_ENV: process.env.NODE_ENV || 'development',
	PORT: toInt(process.env.PORT, 3001),
	DB_ENABLED: toBoolean(process.env.DB_ENABLED, false),
	DB_HOST: process.env.DB_HOST || '127.0.0.1',
	DB_PORT: toInt(process.env.DB_PORT, 3306),
	DB_USER: process.env.DB_USER || 'root',
	DB_PASSWORD: process.env.DB_PASSWORD || '',
	DB_NAME: process.env.DB_NAME || 'goli_transit',
	DB_POOL_SIZE: toInt(process.env.DB_POOL_SIZE, 10),
	REDIS_ENABLED: toBoolean(process.env.REDIS_ENABLED, true),
	REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
	REDIS_GRAPH_TTL_SECONDS: toInt(process.env.REDIS_GRAPH_TTL_SECONDS, 3600),
	REDIS_ROUTE_TTL_SECONDS: toInt(process.env.REDIS_ROUTE_TTL_SECONDS, 600)
};