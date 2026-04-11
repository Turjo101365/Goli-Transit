import { dbQuery } from '../config/db.js';

function mapUserRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		name: row.name,
		email: row.email,
		passwordHash: row.password_hash,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

async function findById(id) {
	const rows = await dbQuery(
		[
			'SELECT id, name, email, password_hash, created_at, updated_at',
			'FROM users',
			'WHERE id = :id',
			'LIMIT 1'
		].join(' '),
		{ id }
	);

	return mapUserRow(rows[0]);
}

export const userRepository = {
	async listUsers() {
		const rows = await dbQuery(
			[
				'SELECT id, name, email, password_hash, created_at, updated_at',
				'FROM users',
				'ORDER BY id DESC'
			].join(' ')
		);

		return rows.map(mapUserRow).filter(Boolean);
	},

	async findByEmail(email) {
		const rows = await dbQuery(
			[
				'SELECT id, name, email, password_hash, created_at, updated_at',
				'FROM users',
				'WHERE email = :email',
				'LIMIT 1'
			].join(' '),
			{ email }
		);

		return mapUserRow(rows[0]);
	},

	findById,

	async createUser({ name, email, passwordHash }) {
		const result = await dbQuery(
			[
				'INSERT INTO users (name, email, password_hash)',
				'VALUES (:name, :email, :passwordHash)'
			].join(' '),
			{
				name,
				email,
				passwordHash
			}
		);

		if (!result.insertId) {
			return null;
		}

		return findById(result.insertId);
	},

	async createPasswordResetToken({ userId, tokenHash, expiresAt }) {
		const result = await dbQuery(
			[
				'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)',
				'VALUES (:userId, :tokenHash, :expiresAt)'
			].join(' '),
			{
				userId,
				tokenHash,
				expiresAt
			}
		);

		return result.insertId || null;
	},

	async markActiveResetTokensConsumed(userId) {
		await dbQuery(
			[
				'UPDATE password_reset_tokens',
				'SET consumed_at = CURRENT_TIMESTAMP',
				'WHERE user_id = :userId',
				'AND consumed_at IS NULL',
				'AND expires_at > CURRENT_TIMESTAMP'
			].join(' '),
			{ userId }
		);
	},

	async findActivePasswordResetToken({ email, tokenHash }) {
		const rows = await dbQuery(
			[
				'SELECT prt.id AS reset_token_id, prt.user_id AS reset_user_id, prt.token_hash, prt.expires_at, prt.consumed_at,',
				'u.id, u.name, u.email, u.password_hash, u.created_at, u.updated_at',
				'FROM password_reset_tokens prt',
				'INNER JOIN users u ON u.id = prt.user_id',
				'WHERE u.email = :email',
				'AND prt.token_hash = :tokenHash',
				'AND prt.consumed_at IS NULL',
				'AND prt.expires_at > CURRENT_TIMESTAMP',
				'ORDER BY prt.id DESC',
				'LIMIT 1'
			].join(' '),
			{ email, tokenHash }
		);

		if (!rows[0]) {
			return null;
		}

		return {
			id: rows[0].reset_token_id,
			userId: rows[0].reset_user_id,
			tokenHash: rows[0].token_hash,
			expiresAt: rows[0].expires_at,
			consumedAt: rows[0].consumed_at,
			user: mapUserRow(rows[0])
		};
	},

	async consumePasswordResetToken(id) {
		await dbQuery(
			[
				'UPDATE password_reset_tokens',
				'SET consumed_at = CURRENT_TIMESTAMP',
				'WHERE id = :id'
			].join(' '),
			{ id }
		);
	},

	async updatePassword(userId, passwordHash) {
		await dbQuery(
			[
				'UPDATE users',
				'SET password_hash = :passwordHash, updated_at = CURRENT_TIMESTAMP',
				'WHERE id = :userId'
			].join(' '),
			{ userId, passwordHash }
		);
	}
};
