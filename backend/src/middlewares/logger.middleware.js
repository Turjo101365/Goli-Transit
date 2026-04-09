import { logger } from '../utils/logger.js';

export function loggerMiddleware(req, res, next) {
	const start = process.hrtime.bigint();

	logger.info('Incoming request', {
		requestId: req.id,
		method: req.method,
		path: req.path
	});

	res.on('finish', () => {
		const durationNs = process.hrtime.bigint() - start;
		const durationMs = Number(durationNs) / 1e6;

		logger.info('Request completed', {
			requestId: req.id,
			method: req.method,
			path: req.path,
			statusCode: res.statusCode,
			durationMs: Number(durationMs.toFixed(2))
		});
	});

	next();
}