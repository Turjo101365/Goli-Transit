import { getRedisClient, initRedis } from '../config/redis.js';

async function resolveClient() {
	const existing = getRedisClient();
	if (existing?.isOpen) {
		return existing;
	}

	return initRedis();
}

export const redisClient = {
	async getJson(key) {
		try {
			const client = await resolveClient();
			if (!client) {
				return null;
			}

			const raw = await client.get(key);
			if (!raw) {
				return null;
			}

			try {
				return JSON.parse(raw);
			} catch {
				return null;
			}
		} catch {
			return null;
		}
	},

	async setJson(key, value, ttlSeconds) {
		try {
			const client = await resolveClient();
			if (!client) {
				return false;
			}

			const payload = JSON.stringify(value);
			if (ttlSeconds && ttlSeconds > 0) {
				await client.set(key, payload, { EX: ttlSeconds });
				return true;
			}

			await client.set(key, payload);
			return true;
		} catch {
			return false;
		}
	},

	async delete(key) {
		try {
			const client = await resolveClient();
			if (!client) {
				return 0;
			}

			return client.del(key);
		} catch {
			return 0;
		}
	},

	async keys(pattern) {
		try {
			const client = await resolveClient();
			if (!client) {
				return [];
			}

			return client.keys(pattern);
		} catch {
			return [];
		}
	}
};