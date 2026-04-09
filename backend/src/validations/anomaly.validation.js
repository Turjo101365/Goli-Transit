import { z } from 'zod';

const affectedEdgeSchema = z.object({
	from: z.string().trim().min(1),
	to: z.string().trim().min(1),
	multiplier: z.number().positive().default(1.5)
});

export const anomalyValidation = z.object({
	type: z.enum(['EDGE_WEIGHT_MULTIPLIER']),
	reason: z.string().trim().min(1),
	affectedEdges: z.array(affectedEdgeSchema).min(1)
});