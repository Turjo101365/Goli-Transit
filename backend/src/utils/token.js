import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { createHttpError } from './http-error.js';

const JWT_ALGORITHM = 'HS256';

function getJwtOptions() {
	return {
		algorithm: JWT_ALGORITHM,
		expiresIn: `${env.AUTH_TOKEN_TTL_HOURS}h`,
		issuer: env.AUTH_JWT_ISSUER
	};
}

export function createAuthToken(user) {
	return jwt.sign(
		{
			name: user.name,
			email: user.email
		},
		env.AUTH_SECRET,
		{
			...getJwtOptions(),
			subject: String(user.id)
		}
	);
}

export function verifyAuthToken(token) {
	try {
		const payload = jwt.verify(token, env.AUTH_SECRET, getJwtOptions());
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
