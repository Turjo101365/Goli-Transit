import { getCondition, getWeatherSnapshot, listWaterloggedAreas } from '../services/weatherService.js';
import { combineCondition, getAutoCondition, dhakaParts } from '../core/modeMatrix.js';
import { WEEKDAY_PEAK_WINDOWS, FRIDAY_PEAK_WINDOW, HIGH_ALERT_ZONES } from '../constants/trafficSchedule.js';

const FRIDAY_WEEKDAY_INDEX = 5;

function activeWindow(now) {
	const { weekdayIndex, hour, minute } = dhakaParts(now);
	const minutesSinceMidnight = hour * 60 + minute;
	const candidates = weekdayIndex === FRIDAY_WEEKDAY_INDEX ? [FRIDAY_PEAK_WINDOW] : WEEKDAY_PEAK_WINDOWS;
	return candidates.find((window) => minutesSinceMidnight >= window.start && minutesSinceMidnight < window.end) || null;
}

export async function conditionController(req, res, next) {
	try {
		const now = new Date();
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
				temperatureC: snapshot.temperatureC,
				observedAt: snapshot.fetchedAt,
				waterloggedAreas,
				// Real-time traffic condition — live weather combined with the
				// school/office/Jummah peak schedule, what mode logic actually uses.
				trafficCondition: combineCondition(condition, now),
				scheduledJam: getAutoCondition(now) === 'jam',
				activeWindow: activeWindow(now),
				peakWindows: WEEKDAY_PEAK_WINDOWS,
				fridayPeakWindow: FRIDAY_PEAK_WINDOW,
				highAlertZones: HIGH_ALERT_ZONES
			},
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
