import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let transporterPromise = null;

function isSecureTransport() {
	return env.MAIL_ENCRYPTION === 'ssl' || env.MAIL_ENCRYPTION === 'smtps' || env.MAIL_PORT === 465;
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

async function getTransporter() {
	if (!env.MAIL_ENABLED) {
		return null;
	}

	if (!transporterPromise) {
		const transporter = nodemailer.createTransport({
			host: env.MAIL_HOST,
			port: env.MAIL_PORT,
			secure: isSecureTransport(),
			auth: env.MAIL_USERNAME && env.MAIL_PASSWORD
				? {
						user: env.MAIL_USERNAME,
						pass: env.MAIL_PASSWORD
					}
				: undefined
		});

		transporterPromise = transporter
			.verify()
			.then(() => {
				logger.info('SMTP mail transport ready');
				return transporter;
			})
			.catch((error) => {
				transporterPromise = null;
				throw error;
			});
	}

	return transporterPromise;
}

export async function sendPasswordResetEmail({ to, name, resetLink, expiresInMinutes }) {
	if (!env.MAIL_ENABLED) {
		logger.warn('Password reset email skipped because mail is disabled');
		return { delivered: false };
	}

	const transporter = await getTransporter();
	const safeName = escapeHtml(name || 'there');
	const safeLink = escapeHtml(resetLink);
	const subject = `Reset your ${env.APP_NAME} password`;
	const text = [
		`Hi ${name || 'there'},`,
		'',
		`We received a request to reset your ${env.APP_NAME} password.`,
		`Use this link within ${expiresInMinutes} minutes:`,
		resetLink,
		'',
		'If you did not request this change, you can safely ignore this email.'
	].join('\n');

	const html = [
		`<p>Hi ${safeName},</p>`,
		`<p>We received a request to reset your <strong>${escapeHtml(env.APP_NAME)}</strong> password.</p>`,
		`<p><a href="${safeLink}">Reset your password</a></p>`,
		`<p>This link expires in ${expiresInMinutes} minutes.</p>`,
		'<p>If you did not request this change, you can safely ignore this email.</p>'
	].join('');

	await transporter.sendMail({
		from: {
			address: env.MAIL_FROM_ADDRESS,
			name: env.MAIL_FROM_NAME
		},
		to,
		subject,
		text,
		html
	});

	logger.info('Password reset email sent', { to });
	return { delivered: true };
}
