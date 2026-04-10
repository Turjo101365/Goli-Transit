import { logger } from '../utils/logger.js';

export function errorMiddleware(err, req, res, _next) {
	const statusCode = Number.isInteger(err.statusCode) ? err.statusCode : 500;
	const code = err.code || (statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
	const safeMessage = statusCode === 500 ? 'Internal server error' : err.message;

	logger.error('Request failed', {
		requestId: req.id,
		method: req.method,
		path: req.path,
		statusCode,
		code,
		message: err.message,
		stack: statusCode === 500 ? err.stack : undefined
	});

	res.status(statusCode).json({
		ok: false,
		error: {
			code,
			message: safeMessage,
			details: err.details || undefined
		},
		requestId: req.id
	});
}
