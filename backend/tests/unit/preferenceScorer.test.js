import test from 'node:test';
import assert from 'node:assert/strict';
import {
	rankRoutesByPreference,
	scoreOption,
	PREFERENCES
} from '../../src/core/algorithms/preferenceScorer.js';

const mockMetroOption = {
	id: 'metro',
	p50: 18,
	p90: 24,
	fare: 30,
	distanceKm: 8.5,
	segments: [
		{ mode: 'walk', min: 4, fare: 0, label: { bn: 'হেঁটে', en: 'Walk' }, pts: [[23.8, 90.4], [23.81, 90.41]] },
		{ mode: 'metro', min: 10, fare: 30, label: { bn: 'মেট্রো', en: 'Metro' }, pts: [[23.81, 90.41], [23.85, 90.42]] },
		{ mode: 'walk', min: 4, fare: 0, label: { bn: 'হেঁটে', en: 'Walk' }, pts: [[23.85, 90.42], [23.86, 90.43]] }
	]
};

const mockBusOption = {
	id: 'bus',
	p50: 38,
	p90: 60,
	fare: 20,
	distanceKm: 9.0,
	segments: [
		{ mode: 'bus', min: 38, fare: 20, label: { bn: 'বাস', en: 'Bus' }, pts: [[23.8, 90.4], [23.86, 90.43]] }
	]
};

const mockCngOption = {
	id: 'cng',
	p50: 25,
	p90: 35,
	fare: 160,
	distanceKm: 8.8,
	segments: [
		{ mode: 'cng', min: 25, fare: 160, label: { bn: 'সিএনজি', en: 'CNG' }, pts: [[23.8, 90.4], [23.86, 90.43]] }
	]
};

const mockWalkOption = {
	id: 'walk',
	p50: 65,
	p90: 75,
	fare: 0,
	distanceKm: 4.5,
	segments: [
		{ mode: 'walk', min: 65, fare: 0, label: { bn: 'হেঁটে', en: 'Walk' }, pts: [[23.8, 90.4], [23.86, 90.43]] }
	]
};

test('Fastest preference ranks minimum travel time first', () => {
	const ranked = rankRoutesByPreference([mockBusOption, mockMetroOption, mockCngOption], PREFERENCES.FASTEST);
	assert.equal(ranked[0].id, 'metro', 'Metro is fastest with 18 mins p50');
	assert.equal(ranked[0].isRecommended, true);
	assert.ok(ranked[0].recommendationReason.bn.includes('দ্রুততম'));
});

test('Cheapest preference ranks lowest fare first', () => {
	const ranked = rankRoutesByPreference([mockCngOption, mockMetroOption, mockBusOption], PREFERENCES.CHEAPEST);
	assert.equal(ranked[0].id, 'bus', 'Bus is cheapest at ৳20');
	assert.equal(ranked[0].isRecommended, true);
	assert.ok(ranked[0].recommendationReason.bn.includes('সাশ্রয়ী'));
});

test('Comfortable preference heavily prioritizes direct comfortable options with zero transfers and low walk', () => {
	const ranked = rankRoutesByPreference([mockMetroOption, mockCngOption, mockBusOption], PREFERENCES.COMFORTABLE);
	// CNG is direct (0 transfers, 0 walk, private comfortable cabin), while Metro has 2 transfers & 8 min walk
	assert.equal(ranked[0].id, 'cng', 'CNG has 0 transfers and high comfort score');
	assert.equal(ranked[0].isRecommended, true);
});

test('Family preference avoids transfers and heavily values comfort and safety', () => {
	const ranked = rankRoutesByPreference([mockBusOption, mockCngOption, mockMetroOption], PREFERENCES.FAMILY);
	assert.equal(ranked[0].id, 'cng', 'CNG is highest family comfort with 0 transfers');
	assert.equal(ranked[0].isRecommended, true);
	assert.ok(ranked[0].recommendationReason.bn.includes('পারিবারিক'));
});

test('Fast + Comfortable preference finds optimal balance', () => {
	const ranked = rankRoutesByPreference([mockBusOption, mockMetroOption, mockCngOption], PREFERENCES.FAST_COMFORTABLE);
	// Metro is much faster (18m vs 25m/38m) and has good comfort
	assert.equal(ranked[0].isRecommended, true);
	assert.ok(ranked[0].recommendationReason.en.includes('Fast & Comfortable') || ranked[0].recommendationReason.bn.includes('দ্রুত ও আরামদায়ক'));
});

test('rankRoutesByPreference handles empty and single item lists gracefully', () => {
	assert.deepEqual(rankRoutesByPreference([]), []);
	const single = rankRoutesByPreference([mockBusOption], PREFERENCES.FASTEST);
	assert.equal(single.length, 1);
	assert.equal(single[0].isRecommended, true);
	assert.equal(single[0].rank, 1);
});
