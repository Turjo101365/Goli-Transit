import { z } from 'zod';
import { CONDITIONS } from '../core/modeMatrix.js';

export const modesQueryValidation = z.object({
	condition: z.enum(CONDITIONS)
});
