import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env.js';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';
import { createAuthToken, verifyAuthToken } from '../../src/utils/token.js';

test('password hashes can be verified without storing plain text', () => {
	const password = 'secret123';
	const passwordHash = hashPassword(password);

	assert.notEqual(passwordHash, password);
	assert.equal(verifyPassword(password, passwordHash), true);
	assert.equal(verifyPassword('wrong-password', passwordHash), false);
});

test('auth tokens can be created and verified for a user session', () => {
	const token = createAuthToken({
		id: '42',
		name: 'Turjo Hasan',
		email: 'turjo@example.com'
	});

	const payload = verifyAuthToken(token);

	assert.equal(payload.sub, '42');
	assert.equal(payload.name, 'Turjo Hasan');
	assert.equal(payload.email, 'turjo@example.com');
	assert.ok(payload.exp > payload.iat);
	assert.equal(payload.iss, env.AUTH_JWT_ISSUER);
	assert.equal(token.split('.').length, 3);
});

test('expired jwt tokens are rejected with a helpful error', () => {
	const expiredToken = jwt.sign(
		{
			name: 'Turjo Hasan',
			email: 'turjo@example.com'
		},
		env.AUTH_SECRET,
		{
			algorithm: 'HS256',
			expiresIn: -10,
			issuer: env.AUTH_JWT_ISSUER,
			subject: '42'
		}
	);

	assert.throws(
		() => verifyAuthToken(expiredToken),
		(error) => error.code === 'AUTH_TOKEN_EXPIRED'
	);
});

test('admin credentials are strictly rejected in commuter (user) login mode', async () => {
	const { authService } = await import('../../src/services/auth.service.js');
	const { userRepository } = await import('../../src/repositories/user.repository.js');

	const adminEmail = `admin_test_${Date.now()}@ezzgo.com`;
	const adminPass = 'AdminTestPass123';
	const reg = await authService.register({
		name: 'Security Admin',
		email: adminEmail,
		password: adminPass
	});

	try {
		await userRepository.updateUserRole(reg.user.id, 'admin');
	} catch {}

	await assert.rejects(
		async () => {
			await authService.login({
				email: adminEmail,
				password: adminPass,
				mode: 'user'
			});
		},
		(error) => {
			assert.equal(error.statusCode, 403);
			assert.equal(error.code, 'AUTH_ADMIN_PORTAL_REQUIRED');
			return true;
		}
	);
});

test('admin credentials are strictly rejected when login mode is omitted (defaults to user)', async () => {
	const { authService } = await import('../../src/services/auth.service.js');
	const { userRepository } = await import('../../src/repositories/user.repository.js');

	const adminEmail = `admin_test_nomode_${Date.now()}@ezzgo.com`;
	const adminPass = 'AdminTestPass123';
	const reg = await authService.register({
		name: 'Security Admin',
		email: adminEmail,
		password: adminPass
	});

	try {
		await userRepository.updateUserRole(reg.user.id, 'admin');
	} catch {}

	await assert.rejects(
		async () => {
			await authService.login({
				email: adminEmail,
				password: adminPass
			});
		},
		(error) => {
			assert.equal(error.statusCode, 403);
			assert.equal(error.code, 'AUTH_ADMIN_PORTAL_REQUIRED');
			return true;
		}
	);
});

test('admin credentials succeed only when logging in through the admin portal (mode: admin)', async () => {
	const { authService } = await import('../../src/services/auth.service.js');
	const { userRepository } = await import('../../src/repositories/user.repository.js');

	const adminEmail = `admin_test_portal_${Date.now()}@ezzgo.com`;
	const adminPass = 'AdminTestPass123';
	const reg = await authService.register({
		name: 'Security Admin',
		email: adminEmail,
		password: adminPass
	});

	try {
		await userRepository.updateUserRole(reg.user.id, 'admin');
	} catch {}

	const result = await authService.login({
		email: adminEmail,
		password: adminPass,
		mode: 'admin'
	});

	assert.ok(result.token);
	assert.equal(result.user.role, 'admin');
	assert.equal(result.user.email, adminEmail);
});

test('regular commuter cannot log in through the admin portal (mode: admin)', async () => {
	const { authService } = await import('../../src/services/auth.service.js');

	// Register a regular commuter account
	const regEmail = `commuter_${Date.now()}@test.local`;
	const regPass = 'Password123';
	await authService.register({
		name: 'Regular Commuter',
		email: regEmail,
		password: regPass
	});

	await assert.rejects(
		async () => {
			await authService.login({
				email: regEmail,
				password: regPass,
				mode: 'admin'
			});
		},
		(error) => {
			assert.equal(error.statusCode, 403);
			assert.equal(error.code, 'AUTH_ADMIN_ACCESS_DENIED');
			return true;
		}
	);

	// But succeeds in normal user mode
	const userSession = await authService.login({
		email: regEmail,
		password: regPass,
		mode: 'user'
	});

	assert.ok(userSession.token);
	assert.equal(userSession.user.role, 'user');
});
