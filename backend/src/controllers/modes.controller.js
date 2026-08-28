import { getAllModeStates } from '../services/modes.service.js';

export async function modesController(req, res, next) {
	try {
		const modes = getAllModeStates(req.query.condition);

		return res.status(200).json({
			ok: true,
			data: { modes },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
