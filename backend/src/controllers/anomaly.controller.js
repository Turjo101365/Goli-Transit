import { anomalyService } from '../services/anomaly.service.js';

export async function anomalyController(req, res, next) {
	try {
		const result = await anomalyService(req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}