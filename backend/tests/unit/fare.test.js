import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDb } from '../../src/config/db.js';
import {
	DEFAULT_FARE_RULES,
	calculateBusFare,
	calculateCngFare,
	calculateRickshawFare,
	calculateMetroFare,
	getFareRules,
	invalidateFareRulesCache
} from '../../src/services/fare.service.js';

test.after(async () => {
	await closeDb().catch(() => {});
});

test('Bus Fare Calculation - Default and Custom Rules', () => {
	// Default: base = 10, per_km = 2.5
	assert.equal(calculateBusFare(2), 10, '2km should meet minimum base fare of 10 Tk');
	assert.equal(calculateBusFare(8), 20, '8km at 2.5 Tk/km should be 20 Tk');

	// Custom: base = 15, per_km = 3.0
	const customRules = { ...DEFAULT_FARE_RULES, brta_bus_base_taka: 15, brta_bus_per_km: 3.0 };
	assert.equal(calculateBusFare(2, customRules), 15, '2km with custom base of 15 Tk');
	assert.equal(calculateBusFare(10, customRules), 30, '10km at 3.0 Tk/km should be 30 Tk');
});

test('CNG Fare Calculation - Default and Custom Rules', () => {
	// Default: base = 50 (first 2km), per_km = 15
	assert.equal(calculateCngFare(1.5), 50, '1.5km within 2km base');
	assert.equal(calculateCngFare(2.0), 50, '2.0km base');
	assert.equal(calculateCngFare(6.0), 50 + (4 * 15), '6km should be base (50) + 4km * 15 = 110 Tk');

	// Custom: base = 60, per_km = 20
	const customRules = { ...DEFAULT_FARE_RULES, cng_base_taka: 60, cng_per_km: 20 };
	assert.equal(calculateCngFare(5, customRules), 60 + (3 * 20), '5km with custom CNG rates = 120 Tk');
});

test('Rickshaw Fare Calculation - Default and Custom Rules', () => {
	// Default: base = 25 (first 1km), per_km = 20
	assert.equal(calculateRickshawFare(0.8), 25, '0.8km within 1km base');
	assert.equal(calculateRickshawFare(1.0), 25, '1.0km base');
	assert.equal(calculateRickshawFare(3.0), 25 + (2 * 20), '3km should be 25 + 2 * 20 = 65 Tk');

	// Custom: base = 30, per_km = 25
	const customRules = { ...DEFAULT_FARE_RULES, rickshaw_base_taka: 30, rickshaw_per_km: 25 };
	assert.equal(calculateRickshawFare(4, customRules), 30 + (3 * 25), '4km with custom Rickshaw rates = 105 Tk');
});

test('Metro Fare Calculation - Default and Custom Rules', () => {
	// Default: base = 20, per_km = 5
	assert.equal(calculateMetroFare(2.0), 20, '2km within base');
	assert.equal(calculateMetroFare(10.0), 20 + (8 * 5), '10km should be 20 + 8 * 5 = 60 Tk');

	// If official static hop fare provided and default rules match
	assert.equal(calculateMetroFare(5.0, 30, DEFAULT_FARE_RULES), 30, 'Preserves official DMTCL hop fare when default');

	// Custom rules override static hop fare
	const customRules = { ...DEFAULT_FARE_RULES, metro_base_taka: 25, metro_per_km: 7 };
	assert.equal(calculateMetroFare(6, 30, customRules), 25 + (4 * 7), 'Custom metro rules calculate dynamic fare');
});

test('Fare Service - Cache and Fallback', async () => {
	invalidateFareRulesCache();
	const rules = await getFareRules();
	assert.ok(rules, 'Should return valid rules object');
	assert.equal(typeof rules.brta_bus_base_taka, 'number');
	assert.equal(typeof rules.cng_base_taka, 'number');
	assert.equal(typeof rules.rickshaw_base_taka, 'number');
	assert.equal(typeof rules.metro_base_taka, 'number');
});
