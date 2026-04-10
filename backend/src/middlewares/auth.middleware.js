import { authService } from '../services/auth.service.js';
import { createHttpError } from '../utils/http-error.js';

function extractBearerToken(authorizationHeader) {
	if (!authorizationHeader) {
		return null;
	}

	const [scheme, token] = authorizationHeader.split(' ');
	if (scheme !== 'Bearer' || !token) {
		return null;
	}

	return token.trim();
}

export async function authMiddleware(req, _res, next) {
	try {
		const token = extractBearerToken(req.headers.authorization);
		if (!token) {
			throw createHttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
		}

		req.user = await authService.getCurrentUser(token);
		req.authToken = token;
		return next();
	} catch (error) {
		return next(error);
	}
}
