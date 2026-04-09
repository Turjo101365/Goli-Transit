import { routeService } from '../services/route.service.js';

export async function routeController(req, res, next) {
	try {
		const routeResult = await routeService(req.body);

		return res.status(200).json({
			ok: true,
			data: routeResult,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}