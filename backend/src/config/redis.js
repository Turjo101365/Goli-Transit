import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redisConfig = {
	enabled: env.REDIS_ENABLED,
	url: env.REDIS_URL,
	graphTtlSeconds: env.REDIS_GRAPH_TTL_SECONDS,
	routeTtlSeconds: env.REDIS_ROUTE_TTL_SECONDS
};

let client = null;
let status = {
	initialized: false,
	connected: false,
	enabled: redisConfig.enabled,
	reason: redisConfig.enabled ? 'pending' : 'disabled'
};

export async function initRedis() {
	if (!redisConfig.enabled) {
		status = {
			initialized: true,
			connected: false,
			enabled: false,
			reason: 'disabled'
		};
		return null;
	}

	if (status.initialized && !status.connected) {
		return null;
	}

	if (client?.isOpen) {
		return client;
	}

	try {
		client = createClient({
			url: redisConfig.url,
			socket: {
				connectTimeout: 1000,
				reconnectStrategy: () => false
			}
		});
		client.on('error', (error) => {
			logger.warn('Redis client error', { message: error.message });
		});

		await client.connect();
		status = {
			initialized: true,
			connected: true,
			enabled: true,
			reason: 'connected'
		};
		logger.info('Redis connected');
		return client;
	} catch (error) {
		status = {
			initialized: true,
			connected: false,
			enabled: true,
			reason: 'connection_failed'
		};
		logger.warn('Redis unavailable, using in-memory cache fallback', {
			message: error.message
		});
		client = null;
		return null;
	}
}

export function getRedisClient() {
	return client;
}

export function getRedisStatus() {
	return { ...status };
}

export async function closeRedis() {
	if (client) {
		try {
			if (client.isOpen) {
				await client.quit();
			}
		} catch {
			// ignore
		} finally {
			client = null;
		}
	}
}