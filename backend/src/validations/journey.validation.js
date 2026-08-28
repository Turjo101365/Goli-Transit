import { z } from 'zod';

export const journeyEvaluateValidation = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
	currentMode: z.enum(['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng']),
	destinationNodeId: z.string().trim().min(1),
	deadlineMinutes: z.number().int().positive()
});
