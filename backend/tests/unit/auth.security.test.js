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
