import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createHttpError } from './http-error.js';

const JWT_ALGORITHM = 'HS256';

function getJwtOptions(ttlHours = env.AUTH_TOKEN_TTL_HOURS) {
	return {
		algorithm: JWT_ALGORITHM,
		expiresIn: `${ttlHours}h`,
		issuer: env.AUTH_JWT_ISSUER
	};
}

export function createAuthToken(user, { ttlHours } = {}) {
	return jwt.sign(
		{
			name: user.name,
			email: user.email
		},
		env.AUTH_SECRET,
		{
			...getJwtOptions(ttlHours),
			subject: String(user.id)
		}
	);
}

export function verifyAuthToken(token) {
	try {
		// jwt.verify reads exp from the token's own claim, so a shorter-TTL
		// guest token (createAuthToken's ttlHours) verifies exactly the same
		// way as a normal one — nothing here needs to know which it is.
		const payload = jwt.verify(token, env.AUTH_SECRET, { algorithms: [JWT_ALGORITHM], issuer: env.AUTH_JWT_ISSUER });
		if (typeof payload !== 'object' || !payload.sub || !payload.email || !payload.exp) {
			throw createHttpError(401, 'AUTH_INVALID_TOKEN', 'Authentication token is invalid.');
		}

		return payload;
	} catch (error) {
		if (error.statusCode) {
			throw error;
		}

		if (error instanceof jwt.TokenExpiredError) {
			throw createHttpError(401, 'AUTH_TOKEN_EXPIRED', 'Session expired. Please log in again.');
		}

		throw createHttpError(401, 'AUTH_INVALID_TOKEN', 'Authentication token is invalid.');
	}
}
