// Stuck-in-traffic detection. Baseline is this corridor's own median+MAD for
// this weekday and 15-minute bucket — never free-flow, except as a narrow
// fallback when no baseline row exists yet (docs/PROPOSAL.md section 6).

import { dbQuery } from '../config/db.js';
import { distance } from '../utils/distance.js';
import { getCondition } from '../services/weatherService.js';

const MAX_ACCURACY_METERS = 50;
const OBSERVED_WINDOW_MS = 5 * 60 * 1000;
const FREEFLOW_FALLBACK_RATIO = 0.4;

// CUSUM slack (km/h): deviations from expected speed smaller than this are
// treated as normal variance and don't accumulate. Threshold is in
// "deviation-km/h * minutes" — a sustained slow patch accumulates faster
// than a brief one. Values chosen so a 90s traffic-signal stop stays well
// under threshold while a 7-minute crawl clears it with margin (see tests).
const CUSUM_SLACK_KMH = 3;
const CUSUM_THRESHOLD = 50;
// "Adaptive on prior" (docs/PROPOSAL.md section 6): fire sooner in rain.
const CUSUM_THRESHOLD_RAIN_FACTOR = 0.6;

function toMillis(timestamp) {
	return timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
}

function discardInaccurate(points) {
	return points.filter((point) => Number(point.accuracy) <= MAX_ACCURACY_METERS);
}

function median(values) {
	if (values.length === 0) {
		return null;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function medianAbsoluteDeviation(values, med) {
	return median(values.map((value) => Math.abs(value - med)));
}

function computeObservedSpeedKmh(points) {
	if (points.length < 2) {
		return null;
	}

	const latestMs = toMillis(points[points.length - 1].timestamp);
	const windowPoints = points.filter((point) => latestMs - toMillis(point.timestamp) <= OBSERVED_WINDOW_MS);
	if (windowPoints.length < 2) {
		return null;
	}

	let totalKm = 0;
	for (let i = 1; i < windowPoints.length; i++) {
		totalKm += distance(windowPoints[i - 1], windowPoints[i]);
	}

	const durationHours = (toMillis(windowPoints[windowPoints.length - 1].timestamp) - toMillis(windowPoints[0].timestamp)) / 3_600_000;
	if (durationHours <= 0) {
		return null;
	}

	return totalKm / durationHours;
}

function dhakaWeekdayAndBucket(referenceMs) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: 'Asia/Dhaka',
		weekday: 'short',
		hour: 'numeric',
		minute: 'numeric',
		hourCycle: 'h23'
	});

	const parts = Object.fromEntries(formatter.formatToParts(new Date(referenceMs)).map((part) => [part.type, part.value]));
	const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
	const bucketIndex = Math.floor((Number(parts.hour) * 60 + Number(parts.minute)) / 15);

	return { weekday, bucketIndex };
}

// Real median+MAD baseline for this corridor/weekday/15-min bucket, falling
// back to 40% of freeflow only when no matching rows exist yet.
async function lookupExpectedSpeed(corridorId, referenceMs) {
	const { weekday, bucketIndex } = dhakaWeekdayAndBucket(referenceMs);

	const bucketRows = await dbQuery(
		[
			'SELECT current_speed_kmh FROM corridor_observations',
			'WHERE corridor_id = :corridorId',
			'AND DAYOFWEEK(observed_at) - 1 = :weekday',
			'AND FLOOR((HOUR(observed_at) * 60 + MINUTE(observed_at)) / 15) = :bucketIndex'
		].join(' '),
		{ corridorId, weekday, bucketIndex }
	);

	if (bucketRows.length > 0) {
		const speeds = bucketRows.map((row) => Number(row.current_speed_kmh));
		const med = median(speeds);
		return { expectedKmh: med, mad: medianAbsoluteDeviation(speeds, med), source: 'baseline' };
	}

	const anyRows = await dbQuery(
		'SELECT freeflow_kmh FROM corridor_observations WHERE corridor_id = :corridorId',
		{ corridorId }
	);

	if (anyRows.length === 0) {
		return { expectedKmh: null, mad: null, source: 'no_data' };
	}

	const freeflowSpeeds = anyRows.map((row) => Number(row.freeflow_kmh));
	const freeflow = median(freeflowSpeeds);
	return { expectedKmh: freeflow * FREEFLOW_FALLBACK_RATIO, mad: null, source: 'freeflow_fallback' };
}

// Pure CUSUM core — no DB, no network. Directly testable.
export function evaluateStuckness({ points, expectedKmh, condition }) {
	const cleanPoints = discardInaccurate(points).sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp));
	const observedKmh = computeObservedSpeedKmh(cleanPoints);

	if (expectedKmh === null || expectedKmh === undefined || cleanPoints.length < 2) {
		return { stuck: false, confidence: 0, observedKmh, expectedKmh };
	}

	const threshold =
		condition === 'rain' || condition === 'heavy_rain'
			? CUSUM_THRESHOLD * CUSUM_THRESHOLD_RAIN_FACTOR
			: CUSUM_THRESHOLD;

	let cusum = 0;
	for (let i = 1; i < cleanPoints.length; i++) {
		const dtHours = (toMillis(cleanPoints[i].timestamp) - toMillis(cleanPoints[i - 1].timestamp)) / 3_600_000;
		if (dtHours <= 0) {
			continue;
		}

		const km = distance(cleanPoints[i - 1], cleanPoints[i]);
		const sampleKmh = km / dtHours;
		const deviation = expectedKmh - sampleKmh; // positive = slower than expected
		const dtMinutes = dtHours * 60;

		cusum = Math.max(0, cusum + (deviation - CUSUM_SLACK_KMH) * dtMinutes);
	}

	return {
		stuck: cusum >= threshold,
		confidence: Math.max(0, Math.min(1, cusum / threshold)),
		observedKmh,
		expectedKmh
	};
}

export async function isStuck(points, corridorId) {
	const cleanPoints = discardInaccurate(points);
	if (cleanPoints.length === 0) {
		return { stuck: false, confidence: 0, observedKmh: null, expectedKmh: null };
	}

	const latestMs = toMillis(cleanPoints[cleanPoints.length - 1].timestamp);
	const [{ expectedKmh }, condition] = await Promise.all([
		lookupExpectedSpeed(corridorId, latestMs),
		getCondition()
	]);

	return evaluateStuckness({ points: cleanPoints, expectedKmh, condition });
}
