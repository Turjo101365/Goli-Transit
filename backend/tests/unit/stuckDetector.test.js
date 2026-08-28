import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStuckness } from '../../src/core/stuckDetector.js';

const EXPECTED_KMH = 20; // synthetic corridor baseline for these tests
const METERS_PER_DEGREE_LAT = 111_320;
const START_LAT = 23.7602;
const START_LNG = 90.3865;

// Builds a straight-line sequence of points moving north at `speedKmh`,
// sampled every `intervalSeconds`, for `count` points (count-1 intervals).
function buildTrack({ speedKmh, intervalSeconds, count, startTime = Date.now() }) {
	const metersPerInterval = speedKmh * 1000 * (intervalSeconds / 3600);
	const latDeltaPerInterval = metersPerInterval / METERS_PER_DEGREE_LAT;

	return Array.from({ length: count }, (_, i) => ({
		lat: START_LAT + latDeltaPerInterval * i,
		lng: START_LNG,
		timestamp: startTime + i * intervalSeconds * 1000,
		accuracy: 15
	}));
}

test('a 90-second stop at a traffic signal does not trigger stuck detection', () => {
	const points = buildTrack({ speedKmh: 0, intervalSeconds: 15, count: 7 }); // 0..90s, stationary

	const result = evaluateStuckness({ points, expectedKmh: EXPECTED_KMH, condition: 'clear' });

	assert.equal(result.stuck, false);
	assert.equal(result.observedKmh, 0);
});

test('a 7-minute crawl well below the baseline speed triggers stuck detection', () => {
	const points = buildTrack({ speedKmh: 3.5, intervalSeconds: 30, count: 15 }); // 0..7min, crawling

	const result = evaluateStuckness({ points, expectedKmh: EXPECTED_KMH, condition: 'clear' });

	assert.equal(result.stuck, true);
	assert.ok(result.observedKmh < EXPECTED_KMH);
	assert.ok(result.confidence > 0);
});

test('points with accuracy worse than 50m are discarded before computing speed', () => {
	const goodTrack = buildTrack({ speedKmh: 3.5, intervalSeconds: 30, count: 15 });
	const withNoise = [
		...goodTrack,
		{ lat: 23.9, lng: 90.9, timestamp: goodTrack.at(-1).timestamp + 1000, accuracy: 500 }
	];

	const result = evaluateStuckness({ points: withNoise, expectedKmh: EXPECTED_KMH, condition: 'clear' });

	// The 500m-accuracy point (which would otherwise register a huge, fast
	// jump) must not be part of the computation at all.
	assert.equal(result.stuck, true);
});

test('a slow-but-normal speed (small deviation within slack) does not trigger', () => {
	const points = buildTrack({ speedKmh: 18, intervalSeconds: 30, count: 15 }); // just under baseline

	const result = evaluateStuckness({ points, expectedKmh: EXPECTED_KMH, condition: 'clear' });

	assert.equal(result.stuck, false);
});

test('rain lowers the threshold so a shorter slow patch still triggers', () => {
	// A 3-minute crawl alone does not clear the clear-weather threshold...
	const shortCrawl = buildTrack({ speedKmh: 3.5, intervalSeconds: 30, count: 7 }); // 0..3min
	const clearResult = evaluateStuckness({ points: shortCrawl, expectedKmh: EXPECTED_KMH, condition: 'clear' });
	assert.equal(clearResult.stuck, false);

	// ...but does clear the lowered rain threshold.
	const rainResult = evaluateStuckness({ points: shortCrawl, expectedKmh: EXPECTED_KMH, condition: 'rain' });
	assert.equal(rainResult.stuck, true);
});

test('fewer than two usable points cannot determine stuckness', () => {
	const result = evaluateStuckness({
		points: [{ lat: START_LAT, lng: START_LNG, timestamp: Date.now(), accuracy: 10 }],
		expectedKmh: EXPECTED_KMH,
		condition: 'clear'
	});

	assert.equal(result.stuck, false);
	assert.equal(result.confidence, 0);
});

test('no baseline available (null expectedKmh) cannot determine stuckness', () => {
	const points = buildTrack({ speedKmh: 3.5, intervalSeconds: 30, count: 15 });

	const result = evaluateStuckness({ points, expectedKmh: null, condition: 'clear' });

	assert.equal(result.stuck, false);
	assert.equal(result.confidence, 0);
	assert.equal(result.expectedKmh, null);
});
