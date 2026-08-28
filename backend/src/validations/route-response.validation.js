import { z } from 'zod';

const segmentModes = ['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng'];

const labelSchema = z.object({
	bn: z.string().min(1),
	en: z.string().min(1)
});

const segmentSchema = z.object({
	mode: z.enum(segmentModes),
	min: z.number().int().nonnegative(),
	// null = no official fixed rate for this mode (rickshaw, bike) — the fare
	// genuinely varies, so this is a "varies" signal, not a missing value.
	fare: z.number().int().nonnegative().nullable(),
	label: labelSchema,
	pts: z.array(z.tuple([z.number(), z.number()])).min(2)
});

const optionSchema = z.object({
	id: z.string().min(1),
	p50: z.number().int().nonnegative(),
	p90: z.number().int().nonnegative(),
	fare: z.number().int().nonnegative().nullable(),
	segments: z.array(segmentSchema).min(1)
});

// See docs/API.md. Options are now computed per request (dynamicRoute
// .service.js) rather than a single frozen dataset — this shape (not the
// data behind it) is what's held stable for consumers.
export const routeResponseValidation = z.object({
	options: z.array(optionSchema)
});
