import { z } from 'zod';

const emailSchema = z
	.string()
	.trim()
	.min(1, 'Email is required.')
	.email('Enter a valid email address.')
	.transform((val) => val.toLowerCase());

const passwordSchema = z
	.string()
	.min(6, 'Password must be at least 6 characters.')
	.max(128, 'Password is too long.');

export const updateProfileValidation = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name must be at least 2 characters.')
		.max(120, 'Name is too long.'),
	email: emailSchema,
	phone: z.string().trim().max(32, 'Phone number is too long.').optional().nullable(),
	avatarUrl: z.string().trim().max(1000000, 'Avatar URL/data is too long.').optional().nullable(),
	bio: z.string().trim().max(255, 'Bio is too long.').optional().nullable()
});

export const changePasswordValidation = z
	.object({
		currentPassword: z.string().optional().nullable(),
		newPassword: passwordSchema,
		confirmNewPassword: z.string().min(1, 'Confirm your new password.')
	})
	.superRefine((payload, context) => {
		if (payload.newPassword !== payload.confirmNewPassword) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				path: ['confirmNewPassword'],
				message: 'New passwords do not match.'
			});
		}
	});

export const deleteAccountValidation = z.object({
	password: z.string().optional().nullable(),
	confirmation: z.string().optional().nullable()
});

export const createTripValidation = z.object({
	fromLocation: z.string().trim().min(1, 'Origin location is required.'),
	toLocation: z.string().trim().min(1, 'Destination location is required.'),
	mode: z.string().trim().max(20).optional().nullable(),
	distanceKm: z.coerce.number().min(0).max(1000).optional().nullable(),
	durationMinutes: z.coerce.number().int().min(0).max(1440).optional().nullable(),
	status: z.enum(['completed', 'in_progress', 'cancelled']).optional().default('completed')
});

export const saveRouteValidation = z.object({
	name: z.string().trim().min(1, 'Route name is required.').max(120),
	fromLocation: z.string().trim().min(1, 'Origin is required.'),
	toLocation: z.string().trim().min(1, 'Destination is required.'),
	mode: z.string().trim().max(20).optional().default('metro'),
	durationMinutes: z.coerce.number().int().min(1).max(1440).optional().nullable()
});

export const favoriteStopValidation = z.object({
	name: z.string().trim().min(1, 'Stop name is required.').max(255),
	nodeId: z.string().trim().max(64).optional().nullable(),
	latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
	longitude: z.coerce.number().min(-180).max(180).optional().nullable()
});
