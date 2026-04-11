import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const SCRYPT_PREFIX = 'scrypt';
const BCRYPT_PREFIX = 'bcrypt';

export function hashPassword(password) {
	return `${BCRYPT_PREFIX}$${bcrypt.hashSync(password, 10)}`;
}

export function verifyPassword(password, passwordHash) {
	if (!passwordHash) {
		return false;
	}

	const [prefix, ...parts] = passwordHash.split('$');

	if (prefix === BCRYPT_PREFIX) {
		const storedHash = parts.join('$');
		return bcrypt.compareSync(password, storedHash);
	}

	if (prefix !== SCRYPT_PREFIX) {
		return false;
	}

	const [salt, storedHash] = parts;
	if (!salt || !storedHash) {
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
