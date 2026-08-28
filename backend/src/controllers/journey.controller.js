import { evaluateJourney } from '../services/journey.service.js';

export async function journeyEvaluateController(req, res, next) {
	try {
		const result = await evaluateJourney({
			userId: req.user.id,
			...req.body
		});

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
