import { createHttpError } from '../utils/http-error.js';

const buckets = new Map();

function clientKey(req) {
	return req.ip || req.socket?.remoteAddress || 'unknown';
}

export function rateLimitMiddleware({ windowMs, max, message = 'Too many requests. Please try again later.' }) {
	return (req, _res, next) => {
		const key = `${req.baseUrl}${req.path}:${clientKey(req)}`;
		const now = Date.now();
		const bucket = buckets.get(key);

		if (!bucket || bucket.resetAt <= now) {
			buckets.set(key, { count: 1, resetAt: now + windowMs });
			return next();
		}

		if (bucket.count >= max) {
			return next(
				createHttpError(429, 'RATE_LIMITED', message, {
					retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000)
				})
			);
		}

		bucket.count += 1;
		return next();
	};
}
