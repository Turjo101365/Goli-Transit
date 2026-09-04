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
		const isGmail = (env.MAIL_HOST && env.MAIL_HOST.includes('gmail')) || env.MAIL_USERNAME?.includes('@gmail.com');
		const transportOptions = isGmail
			? {
					service: 'gmail',
					auth: {
						user: env.MAIL_USERNAME,
						pass: env.MAIL_PASSWORD?.replace(/\s+/g, '')
					},
					tls: {
						rejectUnauthorized: false
					}
			  }
			: {
					host: env.MAIL_HOST,
					port: env.MAIL_PORT,
					secure: isSecureTransport(),
					auth: env.MAIL_USERNAME && env.MAIL_PASSWORD
						? {
								user: env.MAIL_USERNAME,
								pass: env.MAIL_PASSWORD
						  }
						: undefined,
					tls: {
						rejectUnauthorized: false
					},
					connectionTimeout: 10000,
					greetingTimeout: 10000,
					socketTimeout: 15000
			  };

		const transporter = nodemailer.createTransport(transportOptions);

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

function handleMailFailure(scope, error, meta = {}) {
	logger.error(`${scope} failed`, {
		...meta,
		message: error?.message || String(error)
	});

	if (env.NODE_ENV !== 'production') {
		logger.warn(`${scope} falling back to mock delivery in development`, meta);
		return { delivered: false, mocked: true };
	}

	throw error;
}

export async function sendPasswordResetEmail({ to, name, resetLink, expiresInMinutes }) {
	if (!env.MAIL_ENABLED) {
		logger.warn('Password reset email skipped because mail is disabled');
		return { delivered: false };
	}

	try {
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
	} catch (error) {
		return handleMailFailure('Password reset email', error, { to });
	}
}

export async function sendVerificationCodeEmail({ to, name, code, expiresInMinutes }) {
	if (!env.MAIL_ENABLED) {
		logger.warn('Verification code email skipped because mail is disabled', {
			to,
			code
		});
		return { delivered: false };
	}

	try {
		const transporter = await getTransporter();
		const safeName = escapeHtml(name || 'there');
		const subject = `Your ${env.APP_NAME} verification code`;
		const text = [
			`Hi ${name || 'there'},`,
			'',
			`Your ${env.APP_NAME} verification code is: ${code}`,
			`It expires in ${expiresInMinutes} minutes.`,
			'',
			'If you did not request this code, you can safely ignore this email.'
		].join('\n');

		const html = [
			`<p>Hi ${safeName},</p>`,
			`<p>Your <strong>${escapeHtml(env.APP_NAME)}</strong> verification code is:</p>`,
			`<p style="font-size: 1.6rem; letter-spacing: 0.2em; font-weight: 700;">${escapeHtml(code)}</p>`,
			`<p>This code expires in ${expiresInMinutes} minutes.</p>`,
			'<p>If you did not request this code, you can safely ignore this email.</p>'
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

		logger.info('Verification code email sent', { to });
		return { delivered: true };
	} catch (error) {
		const fallbackResult = handleMailFailure('Verification code email', error, { to, code });

		if (env.NODE_ENV !== 'production') {
			logger.info('Verification code generated for local development', { to, code });
			return fallbackResult;
		}

		return fallbackResult;
	}
}

export async function sendAdminInviteEmail({ to, name, role, tempPassword, inviterName }) {
	const portalUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/login`;
	const roleTitle = role === 'admin' ? 'Administrator' : 'Moderator';
	const safeName = escapeHtml(name || 'there');
	const safeInviter = escapeHtml(inviterName || 'Super Admin');
	const safeRole = escapeHtml(roleTitle);
	const subject = `You've been invited as an ${roleTitle} to ${env.APP_NAME}`;

	if (!env.MAIL_ENABLED) {
		logger.info('Admin invitation email mocked (mail disabled)', {
			to,
			role,
			portalUrl
		});
		return { delivered: false, mocked: true };
	}

	try {
		const transporter = await getTransporter();
		const text = [
			`Hi ${name || 'there'},`,
			'',
			`${inviterName || 'Super Admin'} has invited you to join the ${env.APP_NAME} team as an ${roleTitle}.`,
			'',
			tempPassword ? `Your initial login credentials:` : `You can log in with your existing account:`,
			`Email: ${to}`,
			tempPassword ? `Temporary Password: ${tempPassword}` : '',
			'',
			`Access the Admin Portal here: ${portalUrl}`,
			'',
			'Please change your password upon your first sign in.'
		].filter(Boolean).join('\n');

		const html = [
			`<p>Hi ${safeName},</p>`,
			`<p><strong>${safeInviter}</strong> has invited you to join the <strong>${escapeHtml(env.APP_NAME)}</strong> team as an <strong>${safeRole}</strong>.</p>`,
			tempPassword
				? `<div style="background: #f4efe3; padding: 12px 16px; border-radius: 6px; border: 1px solid #d4cebe; margin: 16px 0;">
						<p style="margin: 0 0 6px 0;"><strong>Login Credentials:</strong></p>
						<p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(to)}</p>
						<p style="margin: 4px 0 0 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 6px; border-radius: 4px;">${escapeHtml(tempPassword)}</code></p>
				   </div>`
				: `<p>You can sign in with your existing account to access the Admin Command Center.</p>`,
			`<p><a href="${portalUrl}" style="display: inline-block; background: #006747; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Sign In to Admin Portal</a></p>`,
			`<p style="color: #666; font-size: 12px;">Please change your password upon your first sign in.</p>`
		].join('');

		await transporter.sendMail({
			from: {
				address: env.MAIL_FROM_ADDRESS || 'noreply@ezzgo.local',
				name: env.MAIL_FROM_NAME || env.APP_NAME
			},
			to,
			subject,
			text,
			html
		});

		logger.info('Admin invitation email sent', { to, role });
		return { delivered: true };
	} catch (error) {
		const fallbackResult = handleMailFailure('Admin invitation email', error, { to, role });
		if (env.NODE_ENV !== 'production') {
			logger.info('Admin invitation generated for local development', { to, role });
			return fallbackResult;
		}
		return fallbackResult;
	}
}
