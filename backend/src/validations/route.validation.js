import { z } from 'zod';

// Real coordinates, not place-name strings — POST /route computes options
// for whatever origin/destination the client sends (dynamicRoute.service.js),
// so it needs real lat/lng, not a name to look up.
export const routeValidation = z.object({
	originLat: z.number().min(-90).max(90),
	originLng: z.number().min(-180).max(180),
	destinationLat: z.number().min(-90).max(90),
	destinationLng: z.number().min(-180).max(180),
	originLabel: z.string().optional(),
	destinationLabel: z.string().optional(),
	preference: z.enum(['fastest', 'comfortable', 'family', 'fast_comfortable', 'cheapest']).optional().default('fastest'),
	allowedModes: z.array(z.enum(['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng'])).optional()
});