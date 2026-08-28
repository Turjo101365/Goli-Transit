import { computeDynamicRouteOptions } from '../services/dynamicRoute.service.js';
import { routeResponseValidation } from '../validations/route-response.validation.js';

// Response shape is validated here as a safety net, not the request body
// (that's validationMiddleware in route.routes.js).
export async function routeController(req, res, next) {
	try {
		const computed = await computeDynamicRouteOptions(req.body);
		const routeResult = routeResponseValidation.parse(computed);

		return res.status(200).json(routeResult);
	} catch (error) {
		return next(error);
	}
}