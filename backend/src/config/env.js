import 'dotenv/config';

function toInt(value, fallback) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveEnvValue(value, fallback = '') {
	if (value === undefined || value === null || value === '') {
		return fallback;
	}

	return value.replace(/\$\{([^}]+)\}/g, (_match, key) => process.env[key] || '');
}

function toBoolean(value, fallback) {
	if (value === undefined) {
		return fallback;
	}

	return value === 'true' || value === '1';
}

function resolveHost(value, nodeEnv) {
	const host = value || '0.0.0.0';
	const isLocalBind = host === '127.0.0.1' || host === 'localhost';

	if (nodeEnv === 'production' && isLocalBind) {
		return '0.0.0.0';
	}

	return host;
}

const appName = resolveEnvValue(process.env.APP_NAME, 'EZZ GO');
const nodeEnv = process.env.NODE_ENV || 'development';

const DEV_JWT_SECRET_PLACEHOLDERS = new Set([
	'ezz-go-dev-secret',
	'change-this-in-production'
]);

function resolveAuthSecret(nodeEnvValue) {
	const configuredSecret = process.env.JWT_SECRET || process.env.AUTH_SECRET || '';

	if (nodeEnvValue === 'production') {
		if (!configuredSecret || DEV_JWT_SECRET_PLACEHOLDERS.has(configuredSecret)) {
			throw new Error(
				'JWT_SECRET must be set to a real secret in production (refusing to start with a missing or placeholder value).'
			);
		}

		return configuredSecret;
	}

	return configuredSecret || 'ezz-go-dev-secret';
}

const isRunningTest = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.argv.some(a => a.includes('test'));

export const env = {
	APP_NAME: appName,
	NODE_ENV: nodeEnv,
	HOST: resolveHost(process.env.HOST, nodeEnv),
	PORT: toInt(process.env.PORT, 8080),
	DATABASE_URL: process.env.DATABASE_URL || '',
	DB_ENABLED: toBoolean(process.env.DB_ENABLED, !isRunningTest),
	DB_SSL: toBoolean(process.env.DB_SSL, false),
	DB_HOST: process.env.DB_HOST || '127.0.0.1',
	DB_PORT: toInt(process.env.DB_PORT, 3306),
	DB_USER: process.env.DB_USER || 'root',
	DB_PASSWORD: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'root123',
	DB_NAME: process.env.DB_NAME || 'GoliTransitDB',
	DB_POOL_SIZE: toInt(process.env.DB_POOL_SIZE, 10),
	REDIS_ENABLED: toBoolean(process.env.REDIS_ENABLED, !isRunningTest),
	REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
	REDIS_GRAPH_TTL_SECONDS: toInt(process.env.REDIS_GRAPH_TTL_SECONDS, 3600),
	REDIS_ROUTE_TTL_SECONDS: toInt(process.env.REDIS_ROUTE_TTL_SECONDS, 600),
	AUTH_SECRET: resolveAuthSecret(nodeEnv),
	AUTH_TOKEN_TTL_HOURS: toInt(process.env.AUTH_TOKEN_TTL_HOURS, 168),
	AUTH_JWT_ISSUER: process.env.AUTH_JWT_ISSUER || appName || 'ezz-go',
	// OAuth client ID from Google Cloud Console — required for POST
	// /auth/google to work. Must match the frontend's VITE_GOOGLE_CLIENT_ID.
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
	RESET_TOKEN_TTL_MINUTES: toInt(process.env.RESET_TOKEN_TTL_MINUTES, 30),
	RESET_CODE_TTL_MINUTES: toInt(process.env.RESET_CODE_TTL_MINUTES, 10),
	RESET_CODE_RESEND_COOLDOWN_SECONDS: toInt(process.env.RESET_CODE_RESEND_COOLDOWN_SECONDS, 45),
	FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
	APP_URL: process.env.APP_URL || 'http://127.0.0.1:8080',
	MAIL_ENABLED: toBoolean(
		process.env.MAIL_ENABLED,
		Boolean(process.env.MAIL_HOST && process.env.MAIL_USERNAME && process.env.MAIL_PASSWORD)
	),
	MAIL_HOST: process.env.MAIL_HOST || '',
	MAIL_PORT: toInt(process.env.MAIL_PORT, 587),
	MAIL_USERNAME: process.env.MAIL_USERNAME || '',
	MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
	MAIL_ENCRYPTION: (process.env.MAIL_ENCRYPTION || 'tls').toLowerCase(),
	MAIL_FROM_ADDRESS: resolveEnvValue(process.env.MAIL_FROM_ADDRESS, process.env.MAIL_USERNAME || ''),
	MAIL_FROM_NAME: resolveEnvValue(process.env.MAIL_FROM_NAME, appName)
};
