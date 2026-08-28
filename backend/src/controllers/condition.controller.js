import { getCondition, getWeatherSnapshot, listWaterloggedAreas } from '../services/weatherService.js';

export async function conditionController(req, res, next) {
	try {
		const [condition, snapshot, waterloggedAreas] = await Promise.all([
			getCondition(),
			getWeatherSnapshot(),
			listWaterloggedAreas()
		]);

		return res.status(200).json({
			ok: true,
			data: {
				condition,
				precipitationMm: snapshot.precipitationMm,
				precipitationProbability: snapshot.precipitationProbability,
				observedAt: snapshot.fetchedAt,
				waterloggedAreas
			},
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
