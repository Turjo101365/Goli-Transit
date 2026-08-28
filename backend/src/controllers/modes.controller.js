import { getAllModeStates } from '../services/modes.service.js';
import { getCondition } from '../services/weatherService.js';
import { combineCondition } from '../core/modeMatrix.js';

export async function modesController(req, res, next) {
	try {
		// ?condition= lets the UI manually explore "what if it were raining" —
		// when omitted, default to the real auto-detected condition (live
		// weather + the school/office/Jummah peak schedule) instead of
		// requiring the client to guess.
		const condition = req.query.condition || combineCondition(await getCondition(), new Date());
		const modes = getAllModeStates(condition);

		return res.status(200).json({
			ok: true,
			data: { modes, autoCondition: condition },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
