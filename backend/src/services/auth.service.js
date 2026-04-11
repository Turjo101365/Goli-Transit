import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { ensureDbAvailable } from '../config/db.js';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/user.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createAuthToken, verifyAuthToken } from '../utils/token.js';
import { sendVerificationCodeEmail } from './mail.service.js';

const resetCodeSessions = new Map();
const memoryUsersByEmail = new Map();
const memoryUsersById = new Map();
const RESET_CODE_LENGTH = 6;
const RESET_CODE_MAX_ATTEMPTS = 5;
let memoryUserSequence = 1;

function normalizeEmail(email) {
	return String(email || '').trim().toLowerCase();
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

function createMemoryUser({ name, email, passwordHash }) {
	const id = `mem-${memoryUserSequence++}`;
	const user = {
		id,
		name,
		email,
		passwordHash,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	memoryUsersByEmail.set(email, user);
	memoryUsersById.set(id, user);
	return user;
}

function findMemoryUserByEmail(email) {
	return memoryUsersByEmail.get(normalizeEmail(email)) || null;
}

function findMemoryUserById(id) {
	return memoryUsersById.get(String(id)) || null;
}

async function hasLiveDatabase() {
	try {
		await ensureDbAvailable();
		return true;
	} catch {
		return false;
	}
}

function createSessionResponse(user) {
	const safeUser = sanitizeUser(user);

	return {
		token: createAuthToken(safeUser),
		user: safeUser
	};
}

function now() {
	return Date.now();
}

function minutesToMs(minutes) {
	return minutes * 60 * 1000;
}

function secondsToMs(seconds) {
	return seconds * 1000;
}

function generateOtp() {
	const lower = 10 ** (RESET_CODE_LENGTH - 1);
	const upper = 10 ** RESET_CODE_LENGTH - 1;
	return String(Math.floor(lower + Math.random() * (upper - lower)));
}

function generateResetToken() {
	return randomBytes(32).toString('hex');
}

function getResetSession(email) {
	return resetCodeSessions.get(email) || null;
}

function upsertResetSession(email, partialSession) {
	const current = getResetSession(email) || {};
	const next = { ...current, email, ...partialSession };
	resetCodeSessions.set(email, next);
	return next;
}

function clearResetSession(email) {
	resetCodeSessions.delete(email);
}

function createForgotPasswordResponse(message = 'Verification code sent successfully to your email') {
	return {
		message,
		expiresInMinutes: env.RESET_CODE_TTL_MINUTES
	};
}

function assertResetSessionActive(session, email) {
	if (!session) {
		throw createHttpError(400, 'AUTH_RESET_INVALID', 'Verification code is invalid or expired.');
	}

	if (session.email !== email) {
		throw createHttpError(400, 'AUTH_RESET_INVALID', 'Verification code is invalid or expired.');
	}

	if (session.expiresAt <= now()) {
		clearResetSession(email);
		throw createHttpError(400, 'AUTH_RESET_EXPIRED', 'Verification code is invalid or expired.');
	}
}

export const authService = {
	async register(payload) {
		const email = normalizeEmail(payload.email);
		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
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
		}

		const existingMemoryUser = findMemoryUserByEmail(email);
		if (existingMemoryUser) {
			throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists.');
		}

		const user = createMemoryUser({
			name: payload.name.trim(),
			email,
			passwordHash: hashPassword(payload.password)
		});

		return createSessionResponse(user);
	},

	async login(payload) {
		const email = normalizeEmail(payload.email);
		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const user = await userRepository.findByEmail(email);
			if (!user || !verifyPassword(payload.password, user.passwordHash)) {
				throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect email or password.');
			}

			return createSessionResponse(user);
		}

		const memoryUser = findMemoryUserByEmail(email);
		if (!memoryUser || !verifyPassword(payload.password, memoryUser.passwordHash)) {
			throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect email or password.');
		}

		return createSessionResponse(memoryUser);
	},

	async getCurrentUser(token) {
		const payload = verifyAuthToken(token);
		if (!payload || !payload.sub) {
			throw createHttpError(401, 'AUTH_INVALID_TOKEN', 'Invalid authentication token.');
		}

		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const user = await userRepository.findById(payload.sub);

			if (!user) {
				throw createHttpError(401, 'AUTH_USER_NOT_FOUND', 'User session is no longer valid. Please log in again.');
			}

			return sanitizeUser(user);
		}

		const memoryUser = findMemoryUserById(payload.sub);
		if (!memoryUser) {
			throw createHttpError(401, 'AUTH_USER_NOT_FOUND', 'User session is no longer valid. Please log in again.');
		}

		return sanitizeUser(memoryUser);
	},

	async sendResetCode(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const user = await userRepository.findByEmail(email);
		if (!user) {
			return createForgotPasswordResponse();
		}

		const existingSession = getResetSession(email);
		if (existingSession && existingSession.resendAvailableAt > now()) {
			throw createHttpError(
				429,
				'AUTH_RESET_COOLDOWN',
				'Please wait a moment before requesting a new code.',
				{ retryAfterSeconds: Math.ceil((existingSession.resendAvailableAt - now()) / 1000) }
			);
		}

		const code = generateOtp();
		const expiresAt = now() + minutesToMs(env.RESET_CODE_TTL_MINUTES);
		const resendAvailableAt = now() + secondsToMs(env.RESET_CODE_RESEND_COOLDOWN_SECONDS);

		if (env.NODE_ENV !== 'production') {
			console.warn('Reset code generated for local development', {
				email,
				code,
				expiresInMinutes: env.RESET_CODE_TTL_MINUTES
			});
		}

		upsertResetSession(email, {
			userId: user.id,
			userEmail: user.email,
			codeHash: bcrypt.hashSync(code, 10),
			expiresAt,
			resendAvailableAt,
			attempts: 0,
			verifiedAt: null,
			resetTokenHash: null,
			resetTokenExpiresAt: null
		});

		try {
			await sendVerificationCodeEmail({
				to: user.email,
				name: user.name,
				code,
				expiresInMinutes: env.RESET_CODE_TTL_MINUTES
			});
		} catch (_error) {
			throw createHttpError(
				500,
				'AUTH_RESET_EMAIL_FAILED',
				'Unable to send the verification code right now. Please try again in a moment.'
			);
		}

		return createForgotPasswordResponse();
	},

	async verifyResetCode(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const code = String(payload.code || '').trim();
		const session = getResetSession(email);
		assertResetSessionActive(session, email);

		if (session.attempts >= RESET_CODE_MAX_ATTEMPTS) {
			clearResetSession(email);
			throw createHttpError(429, 'AUTH_RESET_ATTEMPTS', 'Too many invalid attempts. Request a new code.');
		}

		if (!bcrypt.compareSync(code, session.codeHash)) {
			session.attempts += 1;
			resetCodeSessions.set(email, session);
			throw createHttpError(400, 'AUTH_RESET_INVALID', 'Verification code is invalid or expired.');
		}

		const resetToken = generateResetToken();
		const resetTokenExpiresAt = now() + minutesToMs(env.RESET_CODE_TTL_MINUTES);

		upsertResetSession(email, {
			verifiedAt: now(),
			resetTokenHash: bcrypt.hashSync(resetToken, 10),
			resetTokenExpiresAt
		});

		return {
			message: 'Verification code confirmed successfully.',
			email,
			resetToken,
			expiresInMinutes: env.RESET_CODE_TTL_MINUTES
		};
	},

	async resetPassword(payload) {
		await ensureDbAvailable();

		const email = normalizeEmail(payload.email);
		const password = payload.password;
		const resetToken = String(payload.resetToken || payload.token || '').trim();
		const session = getResetSession(email);
		assertResetSessionActive(session, email);

		if (!session.verifiedAt || !session.resetTokenHash || !session.resetTokenExpiresAt) {
			throw createHttpError(400, 'AUTH_RESET_UNVERIFIED', 'Please verify the code before resetting your password.');
		}

		if (session.resetTokenExpiresAt <= now()) {
			clearResetSession(email);
			throw createHttpError(400, 'AUTH_RESET_EXPIRED', 'Your reset session expired. Request a new code.');
		}

		if (!bcrypt.compareSync(resetToken, session.resetTokenHash)) {
			throw createHttpError(400, 'AUTH_RESET_INVALID', 'Reset session is invalid or expired.');
		}

		const user = await userRepository.findByEmail(email);
		if (!user) {
			clearResetSession(email);
			throw createHttpError(400, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
		}

		await userRepository.updatePassword(user.id, hashPassword(password));
		clearResetSession(email);

		return {
			message: 'Password updated successfully'
		};
	},

	async forgotPassword(payload) {
		return this.sendResetCode(payload);
	},

	async verifyCode(payload) {
		return this.verifyResetCode(payload);
	},

	async getResetSession(email) {
		const session = getResetSession(normalizeEmail(email));
		if (!session) {
			return null;
		}

		return {
			email: session.email,
			expiresAt: session.expiresAt,
			resendAvailableAt: session.resendAvailableAt,
			verifiedAt: session.verifiedAt
		};
	}
};
