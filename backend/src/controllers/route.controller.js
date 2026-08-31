import { computeDynamicRouteOptions } from '../services/dynamicRoute.service.js';
import { simulateAstarRoute } from '../services/routeSimulation.service.js';
import { routeResponseValidation } from '../validations/route-response.validation.js';
import { profileRepository } from '../repositories/profile.repository.js';

// Response shape is validated here as a safety net, not the request body
// (that's validationMiddleware in route.routes.js).
export async function routeController(req, res, next) {
	try {
		const computed = await computeDynamicRouteOptions(req.body);
		const routeResult = routeResponseValidation.parse(computed);

		// Automatically log route usage for the active user (registered or guest)
		if (req.user?.id && routeResult.options?.length > 0) {
			const topOption = routeResult.options[0];
			const fromLocation = req.body.originLabel || `${req.body.originLat.toFixed(3)}, ${req.body.originLng.toFixed(3)}`;
			const toLocation = req.body.destinationLabel || `${req.body.destinationLat.toFixed(3)}, ${req.body.destinationLng.toFixed(3)}`;
			const mode = topOption.segments?.[0]?.mode || topOption.id || 'metro';

			profileRepository.createTrip({
				userId: req.user.id,
				fromLocation,
				toLocation,
				mode,
				distanceKm: topOption.distanceKm || 0,
				durationMinutes: topOption.p90 || 0,
				status: 'completed'
			}).catch(() => {});
		}

		return res.status(200).json(routeResult);
	} catch (error) {
		return next(error);
	}
}

export async function routeSimulationController(req, res, next) {
	try {
		const simulation = await simulateAstarRoute(req.body);

		return res.status(200).json({
			ok: true,
			data: simulation,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}