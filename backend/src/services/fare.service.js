import { dbQuery } from '../config/db.js';

export const DEFAULT_FARE_RULES = {
	brta_bus_base_taka: 10,
	brta_bus_per_km: 2.5,
	cng_base_taka: 50,
	cng_per_km: 15.0,
	rickshaw_base_taka: 25,
	rickshaw_per_km: 20.0,
	metro_base_taka: 20,
	metro_per_km: 5.0
};

let cachedRules = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds memory cache

export function invalidateFareRulesCache() {
	cachedRules = null;
	lastFetchTime = 0;
}

export async function getFareRules() {
	const now = Date.now();
	if (cachedRules && (now - lastFetchTime < CACHE_TTL_MS)) {
		return cachedRules;
	}

	try {
		const rows = await dbQuery(`SELECT value_json FROM system_settings WHERE key_name = 'fare_rules' LIMIT 1`);
		if (rows && rows.length > 0) {
			const raw = rows[0].value_json;
			const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
			if (parsed && typeof parsed === 'object') {
				cachedRules = {
					brta_bus_base_taka: Number(parsed.brta_bus_base_taka) || DEFAULT_FARE_RULES.brta_bus_base_taka,
					brta_bus_per_km: Number(parsed.brta_bus_per_km) || DEFAULT_FARE_RULES.brta_bus_per_km,
					cng_base_taka: Number(parsed.cng_base_taka) || DEFAULT_FARE_RULES.cng_base_taka,
					cng_per_km: Number(parsed.cng_per_km) || DEFAULT_FARE_RULES.cng_per_km,
					rickshaw_base_taka: Number(parsed.rickshaw_base_taka) || DEFAULT_FARE_RULES.rickshaw_base_taka,
					rickshaw_per_km: Number(parsed.rickshaw_per_km) || DEFAULT_FARE_RULES.rickshaw_per_km,
					metro_base_taka: Number(parsed.metro_base_taka) || DEFAULT_FARE_RULES.metro_base_taka,
					metro_per_km: Number(parsed.metro_per_km) || DEFAULT_FARE_RULES.metro_per_km
				};
				lastFetchTime = now;
				return cachedRules;
			}
		}
	} catch {
		// Fallback to default fare rules if table or DB not reachable
	}

	cachedRules = { ...DEFAULT_FARE_RULES };
	lastFetchTime = now;
	return cachedRules;
}

export function calculateBusFare(distanceKm, rules = DEFAULT_FARE_RULES) {
	const base = Number(rules?.brta_bus_base_taka) || DEFAULT_FARE_RULES.brta_bus_base_taka;
	const perKm = Number(rules?.brta_bus_per_km) || DEFAULT_FARE_RULES.brta_bus_per_km;
	return Math.max(base, Math.round(distanceKm * perKm));
}

export function calculateCngFare(distanceKm, rules = DEFAULT_FARE_RULES) {
	const base = Number(rules?.cng_base_taka) || DEFAULT_FARE_RULES.cng_base_taka;
	const perKm = Number(rules?.cng_per_km) || DEFAULT_FARE_RULES.cng_per_km;
	if (distanceKm <= 2) {
		return base;
	}
	return Math.round(base + (distanceKm - 2) * perKm);
}

export function calculateRickshawFare(distanceKm, rules = DEFAULT_FARE_RULES) {
	const base = Number(rules?.rickshaw_base_taka) || DEFAULT_FARE_RULES.rickshaw_base_taka;
	const perKm = Number(rules?.rickshaw_per_km) || DEFAULT_FARE_RULES.rickshaw_per_km;
	if (distanceKm <= 1) {
		return base;
	}
	return Math.round(base + (distanceKm - 1) * perKm);
}

export function calculateMetroFare(distanceKm, staticHopFare = 0, rules = DEFAULT_FARE_RULES) {
	const base = Number(rules?.metro_base_taka) || DEFAULT_FARE_RULES.metro_base_taka;
	const perKm = Number(rules?.metro_per_km) || DEFAULT_FARE_RULES.metro_per_km;
	if (staticHopFare > 0 && base === DEFAULT_FARE_RULES.metro_base_taka && perKm === DEFAULT_FARE_RULES.metro_per_km) {
		return staticHopFare;
	}
	if (distanceKm <= 2) {
		return base;
	}
	return Math.round(base + (distanceKm - 2) * perKm);
}
