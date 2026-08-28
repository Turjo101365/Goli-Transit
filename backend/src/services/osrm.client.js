import { logger } from '../utils/logger.js';

// OSRM's public demo server — free, no key. Used only to snap two points to
// real street geometry and get a real road-network distance; travel time is
// computed separately from our own per-mode speed constants (config.journey
// MODE_SPEED_KMH), not OSRM's driving-speed duration, since that reflects
// free-flow car speed, not Dhaka's actual bus/rickshaw/CNG/bike pace.
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';
const OSRM_TIMEOUT_MS = 6000;

// walk -> foot (pedestrian network), bike -> the same "bike" profile the
// public demo hosts, everything else that shares the road with cars
// (bus/cng/rickshaw) -> driving, the closest real road-network profile OSRM
// offers for a road vehicle.
const PROFILE_BY_MODE = {
	walk: 'foot',
	bike: 'bike',
	bus: 'driving',
	cng: 'driving',
	rickshaw: 'driving'
};

// Real, road-snapped geometry + distance between two points, or null if
// OSRM can't be reached or finds no route — callers must degrade gracefully
// (skip that option), never fall back to a straight line silently presented
// as a real route.
export async function fetchOsrmRoute(mode, from, to) {
	const profile = PROFILE_BY_MODE[mode];
	if (!profile) {
		return null;
	}

	const url =
		`${OSRM_BASE_URL}/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}` +
		'?overview=full&geometries=geojson';

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		const route = data?.routes?.[0];
		if (data.code !== 'Ok' || !route) {
			return null;
		}

		return {
			distanceKm: route.distance / 1000,
			geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
		};
	} catch (error) {
		logger.warn(`OSRM route request failed (${mode}): ${error.message}`);
		return null;
	} finally {
		clearTimeout(timeoutId);
	}
}
