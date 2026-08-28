import test from 'node:test';
import assert from 'node:assert/strict';
import { getModeState, MODES, CONDITIONS } from '../../src/core/modeMatrix.js';

// A normal midday timestamp, well outside both metro service-window rules.
const NORMAL_TIMESTAMP = '2026-08-31T04:00:00Z'; // Monday 10:00 AM Dhaka

const EXPECTED = {
	walk: { clear: 0, jam: 0, rain: 1 },
	metro: { clear: 0, jam: 0, rain: 0 },
	bus: { clear: 0, jam: 1, rain: 1 },
	rickshaw: { clear: 0, jam: 0, rain: 1 },
	bike: { clear: 0, jam: 0, rain: 2 },
	cng: { clear: 0, jam: 1, rain: 1 }
};

test('every mode has an entry for every condition', () => {
	for (const mode of MODES) {
		for (const condition of CONDITIONS) {
			const result = getModeState(mode, condition, NORMAL_TIMESTAMP);
			assert.ok(result, `expected a result for ${mode}/${condition}`);
			assert.equal(typeof result.state, 'number');
			assert.equal(typeof result.fareMultiplier, 'number');
			assert.equal(typeof result.reason.bn, 'string');
			assert.equal(typeof result.reason.en, 'string');
		}
	}
});

for (const mode of MODES) {
	for (const condition of CONDITIONS) {
		test(`${mode} under ${condition} has state ${EXPECTED[mode][condition]}`, () => {
			const result = getModeState(mode, condition, NORMAL_TIMESTAMP);
			assert.equal(result.state, EXPECTED[mode][condition]);
		});
	}
}

test('metro is state 0 under every condition outside service-window closures', () => {
	for (const condition of CONDITIONS) {
		const result = getModeState('metro', condition, NORMAL_TIMESTAMP);
		assert.equal(result.state, 0);
	}
});

test('rain: bike is unusable (state 2)', () => {
	assert.equal(getModeState('bike', 'rain', NORMAL_TIMESTAMP).state, 2);
});

test('rain: cng is degraded with a 2.5x fare multiplier', () => {
	const result = getModeState('cng', 'rain', NORMAL_TIMESTAMP);
	assert.equal(result.state, 1);
	assert.equal(result.fareMultiplier, 2.5);
});

test('rain: rickshaw is degraded with a 2.2x fare multiplier', () => {
	const result = getModeState('rickshaw', 'rain', NORMAL_TIMESTAMP);
	assert.equal(result.state, 1);
	assert.equal(result.fareMultiplier, 2.2);
});

test('rain: walk is degraded (waterlogging)', () => {
	assert.equal(getModeState('walk', 'rain', NORMAL_TIMESTAMP).state, 1);
});

test('jam: bus and cng are degraded, metro is unaffected', () => {
	assert.equal(getModeState('bus', 'jam', NORMAL_TIMESTAMP).state, 1);
	assert.equal(getModeState('cng', 'jam', NORMAL_TIMESTAMP).state, 1);
	assert.equal(getModeState('metro', 'jam', NORMAL_TIMESTAMP).state, 0);
});

test('non-metro modes ignore the timestamp entirely', () => {
	const lateNight = getModeState('bus', 'clear', '2026-08-31T15:00:00Z'); // 9 PM Dhaka
	const midday = getModeState('bus', 'clear', NORMAL_TIMESTAMP);
	assert.deepEqual(lateNight, midday);
});

test('metro service window: closed after 8:50 PM (exact boundary)', () => {
	const result = getModeState('metro', 'clear', '2026-08-31T14:50:00Z'); // Mon 8:50 PM Dhaka
	assert.equal(result.state, 2);
});

test('metro service window: still open one minute before 8:50 PM', () => {
	const result = getModeState('metro', 'clear', '2026-08-31T14:49:00Z'); // Mon 8:49 PM Dhaka
	assert.equal(result.state, 0);
});

test('metro service window: clearly closed at 9 PM', () => {
	const result = getModeState('metro', 'rain', '2026-08-31T15:00:00Z'); // Mon 9:00 PM Dhaka
	assert.equal(result.state, 2);
});

test('metro service window: closed before 3:30 PM on Friday', () => {
	const result = getModeState('metro', 'clear', '2026-08-28T04:00:00Z'); // Fri 10:00 AM Dhaka
	assert.equal(result.state, 2);
});

test('metro service window: open at exactly 3:30 PM on Friday', () => {
	const result = getModeState('metro', 'clear', '2026-08-28T09:30:00Z'); // Fri 3:30 PM Dhaka
	assert.equal(result.state, 0);
});

test('metro service window: still closed one minute before 3:30 PM on Friday', () => {
	const result = getModeState('metro', 'clear', '2026-08-28T09:29:00Z'); // Fri 3:29 PM Dhaka
	assert.equal(result.state, 2);
});

test('metro service window: open mid-afternoon on Friday, after the 3:30 PM opening', () => {
	const result = getModeState('metro', 'jam', '2026-08-28T10:00:00Z'); // Fri 4:00 PM Dhaka
	assert.equal(result.state, 0);
});

test('metro service window: the Friday-morning rule does not apply on other weekdays', () => {
	const result = getModeState('metro', 'clear', '2026-08-31T04:00:00Z'); // Mon 10:00 AM Dhaka
	assert.equal(result.state, 0);
});

test('unknown mode throws', () => {
	assert.throws(() => getModeState('car', 'clear', NORMAL_TIMESTAMP));
});

test('unknown condition throws', () => {
	assert.throws(() => getModeState('walk', 'storm', NORMAL_TIMESTAMP));
});
