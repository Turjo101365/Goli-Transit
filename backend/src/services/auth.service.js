import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
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

// Guest sessions: never touch the real users table (DB or in-memory
// fallback) regardless of DB availability — "emergency, temporary access"
// means genuinely temporary, not a shadow account. Kept in their own map so
// a guest is findable by getCurrentUser() the same way whether or not
// MySQL is up, and a short, fixed TTL (not env.AUTH_TOKEN_TTL_HOURS' 7
// days) so a guest session doesn't linger indefinitely.
const guestUsersById = new Map();
const GUEST_SESSION_TTL_HOURS = 6;
const GUEST_EMAIL_DOMAIN = 'guest.ezzgo.local';

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

// Verifies the ID token's signature, audience and expiry against Google's
// own public keys — never trust a client-supplied credential without this.
async function verifyGoogleCredential(credential) {
	if (!googleClient) {
		throw createHttpError(500, 'AUTH_GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured on this server.');
	}

	let ticket;
	try {
		ticket = await googleClient.verifyIdToken({
			idToken: credential,
			audience: env.GOOGLE_CLIENT_ID
		});
	} catch {
		throw createHttpError(401, 'AUTH_GOOGLE_INVALID', 'Google sign-in could not be verified.');
	}

	const payload = ticket.getPayload();
	if (!payload?.email || !payload.email_verified) {
		throw createHttpError(401, 'AUTH_GOOGLE_UNVERIFIED_EMAIL', 'Your Google account email is not verified.');
	}

	return {
		email: normalizeEmail(payload.email),
		name: payload.name || payload.email.split('@')[0]
	};
}

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
	const safe = {
		id: String(user.id),
		name: user.name,
		email: user.email,
		role: user.role || 'user',
		status: user.status || 'active',
		phone: user.phone || null,
		avatarUrl: user.avatarUrl || user.avatar_url || null,
		bio: user.bio || null,
		hasPassword: Boolean(user.passwordHash || user.password_hash),
		lastLoginAt: serializeDate(user.lastLoginAt || user.last_login_at),
		createdAt: serializeDate(user.createdAt || user.created_at),
		updatedAt: serializeDate(user.updatedAt || user.updated_at)
	};

	if (user.isGuest || (user.email && user.email.includes(`@${GUEST_EMAIL_DOMAIN}`))) {
		safe.isGuest = true;
		safe.role = 'user';
	}

	return safe;
}

function createGuestUser() {
	const id = `guest-${memoryUserSequence++}-${randomBytes(4).toString('hex')}`;
	const user = {
		id,
		name: 'Guest',
		email: `${id}@${GUEST_EMAIL_DOMAIN}`,
		role: 'user',
		status: 'active',
		phone: null,
		avatarUrl: null,
		bio: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		isGuest: true
	};

	guestUsersById.set(id, user);
	return user;
}

function findGuestUserById(id) {
	return guestUsersById.get(String(id)) || null;
}

function createMemoryUser({ name, email, passwordHash, role = 'user', phone = null, avatarUrl = null, bio = null }) {
	const id = `mem-${memoryUserSequence++}`;
	const normEmail = normalizeEmail(email);
	const userRole = (normEmail === 'turjo5892@gmail.com' || normEmail === 'turjo582@gmail.com' || normEmail === 'admin@ezzgo.com' || normEmail === 'demo@ezzgo.local') ? 'admin' : role;
	const user = {
		id,
		name,
		email: normEmail,
		passwordHash,
		role: userRole,
		status: 'active',
		phone,
		avatarUrl,
		bio,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	memoryUsersByEmail.set(normEmail, user);
	memoryUsersById.set(id, user);
	return user;
}

function findMemoryUserByEmail(email) {
	const norm = normalizeEmail(email);
	if (memoryUsersByEmail.has(norm)) {
		return memoryUsersByEmail.get(norm);
	}
	if (norm === 'turjo5892@gmail.com' || norm === 'turjo582@gmail.com') {
		return createMemoryUser({
			name: 'Turjo (Admin)',
			email: norm,
			passwordHash: hashPassword('Turjo1244'),
			role: 'admin'
		});
	}
	if (norm === 'admin@ezzgo.com') {
		return createMemoryUser({
			name: 'Super Admin',
			email: norm,
			passwordHash: hashPassword('Admin@123'),
			role: 'admin'
		});
	}
	if (norm === 'demo@ezzgo.local') {
		return createMemoryUser({
			name: 'Demo Commuter',
			email: norm,
			passwordHash: hashPassword('Demo1234'),
			role: 'admin'
		});
	}
	return null;
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

function createSessionResponse(user, { ttlHours } = {}) {
	const safeUser = sanitizeUser(user);

	return {
		token: createAuthToken(safeUser, { ttlHours }),
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
		if (!email) {
			throw createHttpError(400, 'AUTH_INVALID_EMAIL', 'A valid email address is required.');
		}

		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const existingUser = await userRepository.findByEmail(email);
			if (existingUser) {
				throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists.');
			}

			try {
				const user = await userRepository.createUser({
					name: payload.name.trim(),
					email,
					passwordHash: hashPassword(payload.password)
				});

				if (!user) {
					throw createHttpError(500, 'AUTH_REGISTER_FAILED', 'Unable to create account right now.');
				}

				return createSessionResponse(user);
			} catch (err) {
				if (
					err?.code === 'ER_DUP_ENTRY' ||
					err?.code === '23505' ||
					String(err?.message || '').includes('duplicate') ||
					String(err?.message || '').includes('Duplicate') ||
					String(err?.message || '').includes('uq_users_email')
				) {
					throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists.');
				}
				throw err;
			}
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

			if (user.status === 'banned' || user.status === 'suspended') {
				throw createHttpError(403, 'AUTH_ACCOUNT_SUSPENDED', `Your account is ${user.status}. Please contact system administrator.`);
			}

			userRepository.updateLastLogin(user.id).catch(() => {});
			return createSessionResponse(user);
		}

		const memoryUser = findMemoryUserByEmail(email);
		if (!memoryUser || !verifyPassword(payload.password, memoryUser.passwordHash)) {
			throw createHttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect email or password.');
		}

		if (memoryUser.status === 'banned' || memoryUser.status === 'suspended') {
			throw createHttpError(403, 'AUTH_ACCOUNT_SUSPENDED', `Your account is ${memoryUser.status}. Please contact system administrator.`);
		}

		return createSessionResponse(memoryUser);
	},

	// Emergency access: no email, no password, no rate-limit-by-identity —
	// Creates a real database user row if DB is live so routes and profile
	// data are persisted, with memory fallback.
	async guest() {
		const dbAvailable = await hasLiveDatabase();
		if (dbAvailable) {
			const guestTag = randomBytes(4).toString('hex');
			const guestEmail = `guest_${guestTag}@${GUEST_EMAIL_DOMAIN}`;
			const dbUser = await userRepository.createUser({
				name: 'Guest Commuter',
				email: guestEmail,
				passwordHash: null
			});

			if (dbUser) {
				const guestUser = {
					...dbUser,
					isGuest: true
				};
				return createSessionResponse(guestUser, { ttlHours: GUEST_SESSION_TTL_HOURS });
			}
		}

		const user = createGuestUser();
		return createSessionResponse(user, { ttlHours: GUEST_SESSION_TTL_HOURS });
	},

	// Same account as email/password login when the emails match — Google
	// sign-in isn't a separate identity, it's just another way into the same
	// user row. A brand-new Google email creates one with no password_hash,
	// same as any account that hasn't set a local password.
	async googleLogin(payload) {
		const { email, name } = await verifyGoogleCredential(payload.credential);
		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const existingUser = await userRepository.findByEmail(email);
			if (existingUser) {
				return createSessionResponse(existingUser);
			}

			const user = await userRepository.createUser({ name, email, passwordHash: null });
			if (!user) {
				throw createHttpError(500, 'AUTH_GOOGLE_LOGIN_FAILED', 'Unable to sign in with Google right now.');
			}

			return createSessionResponse(user);
		}

		const existingMemoryUser = findMemoryUserByEmail(email);
		if (existingMemoryUser) {
			return createSessionResponse(existingMemoryUser);
		}

		const user = createMemoryUser({ name, email, passwordHash: null });
		return createSessionResponse(user);
	},

	async getCurrentUser(token) {
		const payload = verifyAuthToken(token);
		if (!payload || !payload.sub) {
			throw createHttpError(401, 'AUTH_INVALID_TOKEN', 'Invalid authentication token.');
		}

		const guestUser = findGuestUserById(payload.sub);
		if (guestUser) {
			return sanitizeUser(guestUser);
		}

		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const user = await userRepository.findById(payload.sub);

			if (!user) {
				throw createHttpError(401, 'AUTH_USER_NOT_FOUND', 'User session is no longer valid. Please log in again.');
			}

			if (user.email && user.email.includes(`@${GUEST_EMAIL_DOMAIN}`)) {
				user.isGuest = true;
			}

			return sanitizeUser(user);
		}

		const memoryUser = findMemoryUserById(payload.sub);
		if (!memoryUser) {
			throw createHttpError(401, 'AUTH_USER_NOT_FOUND', 'User session is no longer valid. Please log in again.');
		}

		if (payload.isGuest) {
			memoryUser.isGuest = true;
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
	},

	async updateProfile(userId, payload) {
		const name = String(payload.name || '').trim();
		const email = normalizeEmail(payload.email);
		const phone = payload.phone ? String(payload.phone).trim() : null;
		const avatarUrl = payload.avatarUrl ? String(payload.avatarUrl).trim() : null;
		const bio = payload.bio ? String(payload.bio).trim() : null;

		const dbAvailable = await hasLiveDatabase();
		if (dbAvailable) {
			const existingUser = await userRepository.findByEmail(email);
			if (existingUser && String(existingUser.id) !== String(userId)) {
				throw createHttpError(409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists.');
			}

			const updatedUser = await userRepository.updateProfile(userId, {
				name,
				email,
				phone,
				avatarUrl,
				bio
			});

			if (!updatedUser) {
				throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
			}

			return sanitizeUser(updatedUser);
		}

		const guestUser = findGuestUserById(userId);
		if (guestUser) {
			guestUser.name = name;
			guestUser.phone = phone;
			guestUser.avatarUrl = avatarUrl;
			guestUser.bio = bio;
			guestUser.updatedAt = new Date();
			return sanitizeUser(guestUser);
		}

		const memoryUser = findMemoryUserById(userId);
		if (!memoryUser) {
			throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
		}

		memoryUser.name = name;
		memoryUser.email = email;
		memoryUser.phone = phone;
		memoryUser.avatarUrl = avatarUrl;
		memoryUser.bio = bio;
		memoryUser.updatedAt = new Date();
		return sanitizeUser(memoryUser);
	},

	async changePassword(userId, payload) {
		const { currentPassword, newPassword } = payload;
		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const user = await userRepository.findById(userId);
			if (!user) {
				throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
			}

			if (user.passwordHash) {
				if (!currentPassword || !verifyPassword(currentPassword, user.passwordHash)) {
					throw createHttpError(400, 'AUTH_INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
				}
			}

			await userRepository.updatePassword(userId, hashPassword(newPassword));
			return { message: 'Password updated successfully' };
		}

		const memoryUser = findMemoryUserById(userId);
		if (!memoryUser) {
			throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
		}

		if (memoryUser.passwordHash) {
			if (!currentPassword || !verifyPassword(currentPassword, memoryUser.passwordHash)) {
				throw createHttpError(400, 'AUTH_INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
			}
		}

		memoryUser.passwordHash = hashPassword(newPassword);
		memoryUser.updatedAt = new Date();
		return { message: 'Password updated successfully' };
	},

	async deleteAccount(userId, payload = {}) {
		const { password } = payload;
		const dbAvailable = await hasLiveDatabase();

		if (dbAvailable) {
			const user = await userRepository.findById(userId);
			if (!user) {
				throw createHttpError(404, 'AUTH_USER_NOT_FOUND', 'User account could not be found.');
			}

			if (user.passwordHash && password) {
				if (!verifyPassword(password, user.passwordHash)) {
					throw createHttpError(400, 'AUTH_INVALID_CREDENTIALS', 'Password confirmation is incorrect.');
				}
			}

			await userRepository.deleteUser(userId);
			return { message: 'Account deleted successfully' };
		}

		const guestUser = findGuestUserById(userId);
		if (guestUser) {
			guestUsersById.delete(String(userId));
			return { message: 'Guest session deleted successfully' };
		}

		const memoryUser = findMemoryUserById(userId);
		if (memoryUser) {
			if (memoryUser.passwordHash && password) {
				if (!verifyPassword(password, memoryUser.passwordHash)) {
					throw createHttpError(400, 'AUTH_INVALID_CREDENTIALS', 'Password confirmation is incorrect.');
				}
			}
			memoryUsersById.delete(String(userId));
			if (memoryUser.email) {
				memoryUsersByEmail.delete(memoryUser.email);
			}
			return { message: 'Account deleted successfully' };
		}

		return { message: 'Account deleted successfully' };
	}
};
