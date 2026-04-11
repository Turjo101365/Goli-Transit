import { getGraphSnapshot, getHealthSnapshot, getRecentDynamicNodes } from '../services/graph.service.js';

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

export async function recentDynamicNodesController(req, res, next) {
	try {
		const DEFAULT_LIMIT = 10;
		const MAX_LIMIT = 50;
		const parsedLimit = Number(req.query.limit);
		const limit = Number.isFinite(parsedLimit) && Number.isInteger(parsedLimit) && parsedLimit > 0
			? Math.min(parsedLimit, MAX_LIMIT)
			: DEFAULT_LIMIT;
		const nodes = await getRecentDynamicNodes(limit);

		return res.status(200).json({
			ok: true,
			data: nodes,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}