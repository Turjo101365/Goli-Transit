import { createHash } from 'node:crypto';
import { redisClient } from './redis.client.js';
import { redisConfig } from '../config/redis.js';

const inMemoryRouteCache = new Map();
const ROUTE_KEY_PREFIX = 'route-cache:v1';

function routeHash(payload) {
	return createHash('sha1')
		.update(
			JSON.stringify({
				origin: payload.origin,
				destination: payload.destination,
				preferredModes: payload.preferredModes,
				avoidModes: payload.avoidModes,
				vehicleType: payload.vehicleType
			})
		)
		.digest('hex');
}

function routeCacheKey(payload) {
	return `${ROUTE_KEY_PREFIX}:${routeHash(payload)}`;
}

export const routeCache = {
	async get(payload) {
		const key = routeCacheKey(payload);
		if (inMemoryRouteCache.has(key)) {
			return inMemoryRouteCache.get(key);
		}

		const cached = await redisClient.getJson(key);
		if (cached) {
			inMemoryRouteCache.set(key, cached);
			return cached;
		}

		return null;
	},

	async set(payload, routeResult) {
		const key = routeCacheKey(payload);
		inMemoryRouteCache.set(key, routeResult);
		await redisClient.setJson(key, routeResult, redisConfig.routeTtlSeconds);
	},

	async invalidateAll() {
		inMemoryRouteCache.clear();

		const keys = await redisClient.keys(`${ROUTE_KEY_PREFIX}:*`);
		for (const key of keys) {
			await redisClient.delete(key);
		}
	}
};