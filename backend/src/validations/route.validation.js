import { z } from 'zod';
import { modes } from '../constants/modes.js';

export const routeValidation = z.object({
	origin: z.string().trim().min(1),
	destination: z.string().trim().min(1),
	preferredModes: z.array(z.enum(modes)).min(1).optional().default(modes),
	avoidModes: z.array(z.enum(modes)).optional().default([]),
	vehicleType: z.enum([
		'pedestrian',
		'bicycle',
		'rickshaw',
		'three-wheeler',
		'bus',
		'metro',
		'motorized',
		'car'
	]).optional().nullable().default(null)
});