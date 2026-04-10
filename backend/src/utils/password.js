import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PASSWORD_HASH_PREFIX = 'scrypt';

export function hashPassword(password) {
	const salt = randomBytes(SALT_LENGTH).toString('hex');
	const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');

	return `${PASSWORD_HASH_PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password, passwordHash) {
	if (!passwordHash) {
		return false;
	}

	const [prefix, salt, storedHash] = passwordHash.split('$');
	if (prefix !== PASSWORD_HASH_PREFIX || !salt || !storedHash) {
		return false;
	}

	try {
		const derivedHash = scryptSync(password, salt, KEY_LENGTH);
		const storedHashBuffer = Buffer.from(storedHash, 'hex');

		if (storedHashBuffer.length !== derivedHash.length) {
			return false;
		}

		return timingSafeEqual(storedHashBuffer, derivedHash);
	} catch {
		return false;
	}
}
