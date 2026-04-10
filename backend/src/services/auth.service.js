import { createHash, randomBytes } from 'node:crypto';
import { ensureDbAvailable } from '../config/db.js';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createAuthToken, verifyAuthToken } from '../utils/token.js';
import { sendPasswordResetEmail } from './mail.service.js';

function normalizeEmail(email) {
	return email.trim().toLowerCase();
}

function serializeDate(value) {
	if (value instanceof Date) {
		return value.toISOString();
	}

	return value;
}

function sanitizeUser(user) {
	return {
		id: String(user.id),
		name: user.name,
		email: user.email,
		createdAt: serializeDate(user.createdAt)
	};
}

function createSessionResponse(user) {
	const safeUser = sanitizeUser(user);

	return {
		token: createAuthToken(safeUser),
		user: safeUser
	};
}

function hashResetToken(token) {
	return createHash('sha256').update(token).digest('hex');
}

function createResetLink(user, token) {
	return `${env.FRONTEND_URL}/?page=reset-password&email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
}

function createForgotPasswordResponse() {
	return {
		message: 'If an account exists for this email, password reset instructions have been sent.',
		expiresInMinutes: env.RESET_TOKEN_TTL_MINUTES
	};
}

export const authService = {
	async register(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const existingUser = await userRepository.findByEmail(email);
		if (existingUser) {
			throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists.');
		}

		const user = await userRepository.createUser({
			name: payload.name.trim(),
			email,
			passwordHash: hashPassword(payload.password)
		});

		if (!user) {
			throw createHttpError(500, 'AUTH_REGISTER_FAILED', 'Unable to create account right now.');
		}

		return createSessionResponse(user);
	},

	async login(payload) {
		await ensureDbAvailable();

		const user = await userRepository.findByEmail(normalizeEmail(payload.email));
		if (!user || !verifyPassword(payload.password, user.passwordHash)) {
			throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect email or password.');
		}

		return createSessionResponse(user);
	},

	async getCurrentUser(token) {
		await ensureDbAvailable();

		const payload = verifyAuthToken(token);
		const user = await userRepository.findById(payload.sub);

		if (!user) {
			throw createHttpError(401, 'AUTH_USER_NOT_FOUND', 'User session is no longer valid. Please log in again.');
		}

		return sanitizeUser(user);
	},

	async forgotPassword(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const user = await userRepository.findByEmail(email);

		if (!user) {
			return createForgotPasswordResponse();
		}

		const rawToken = randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_MINUTES * 60 * 1000);

		await userRepository.markActiveResetTokensConsumed(user.id);
		await userRepository.createPasswordResetToken({
			userId: user.id,
			tokenHash: hashResetToken(rawToken),
			expiresAt
		});

		const resetLink = createResetLink(user, rawToken);

		try {
			await sendPasswordResetEmail({
				to: user.email,
				name: user.name,
				resetLink,
				expiresInMinutes: env.RESET_TOKEN_TTL_MINUTES
			});
		} catch (_error) {
			throw createHttpError(
				500,
				'AUTH_RESET_EMAIL_FAILED',
				'Unable to send the reset email right now. Please try again in a moment.'
			);
		}

		return createForgotPasswordResponse();
	},

	async resetPassword(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const resetEntry = await userRepository.findActivePasswordResetToken({
			email,
			tokenHash: hashResetToken(payload.token.trim())
		});

		if (!resetEntry) {
			throw createHttpError(400, 'AUTH_RESET_INVALID', 'Reset token is invalid or expired.');
		}

		await userRepository.updatePassword(resetEntry.userId, hashPassword(payload.password));
		await userRepository.consumePasswordResetToken(resetEntry.id);

		return createSessionResponse(resetEntry.user);
	}
};
