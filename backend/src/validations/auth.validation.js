import { z } from 'zod';

const emailSchema = z
	.string()
	.trim()
	.min(1, 'Email is required.')
	.email('Enter a valid email address.')
	.transform((value) => value.toLowerCase());

const passwordSchema = z
	.string()
	.min(6, 'Password must be at least 6 characters.')
	.max(128, 'Password is too long.');

export const registerValidation = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, 'Full name is required.')
			.max(120, 'Full name is too long.'),
		email: emailSchema,
		password: passwordSchema,
		confirmPassword: z.string().min(1, 'Confirm your password.')
	})
	.superRefine((payload, context) => {
		if (payload.password !== payload.confirmPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['confirmPassword'],
				message: 'Passwords do not match.'
			});
		}
	});

export const loginValidation = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required.')
});

export const googleLoginValidation = z.object({
	credential: z.string().trim().min(1, 'Google credential is required.')
});

export const forgotPasswordValidation = z.object({
	email: emailSchema
});

export const sendResetCodeValidation = z.object({
	email: emailSchema
});

export const verifyResetCodeValidation = z.object({
	email: emailSchema,
	code: z.string().trim().length(6, 'Verification code must be 6 digits.')
});

export const resetPasswordValidation = z
	.object({
		email: emailSchema,
		resetToken: z.string().trim().min(1, 'Reset token is required.').optional(),
		token: z.string().trim().min(1, 'Reset token is required.').optional(),
		password: passwordSchema,
		confirmPassword: z.string().min(1, 'Confirm your password.')
	})
	.superRefine((payload, context) => {
		if (!payload.resetToken && !payload.token) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['resetToken'],
				message: 'Reset token is required.'
			});
		}

		if (payload.password !== payload.confirmPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['confirmPassword'],
				message: 'Passwords do not match.'
			});
		}
	});
