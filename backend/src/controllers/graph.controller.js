import { getGraphSnapshot, getHealthSnapshot } from '../services/graph.service.js';

export async function graphController(req, res, next) {
	try {
		const snapshot = await getGraphSnapshot();

		return res.status(200).json({
			ok: true,
			data: snapshot,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function healthController(req, res, next) {
	try {
		const health = await getHealthSnapshot();

		return res.status(200).json({
			...health,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}