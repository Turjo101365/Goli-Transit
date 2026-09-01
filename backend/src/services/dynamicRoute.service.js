import { ensureGraphCache } from '../cache/graph.cache.js';
import { metroPath, nearestMetroStation } from '../core/algorithms/metroPath.js';
import { fetchOsrmRoute } from './osrm.client.js';
import { distance } from '../utils/distance.js';
import { config } from '../constants/config.js';
import { rankRoutesByPreference, PREFERENCES } from '../core/algorithms/preferenceScorer.js';

const {
	WALKING_SPEED_KMH,
	ACCESS_WALK_LIMIT_KM,
	METRO_ACCESS_RADIUS_KM,
	MODE_SPEED_KMH,
	MODE_WAIT_MINUTES,
	P90_RATIO,
	FARE
} = config.journey;

const ACCESS_LABEL = {
	walk: { bn: 'হেঁটে স্টেশনে', en: 'Walk to station' },
	rickshaw: { bn: 'রিকশায় স্টেশনে', en: 'Rickshaw to station' },
	bus: { bn: 'বাসে স্টেশনে', en: 'Bus to station' }
};

const DIRECT_LABEL = {
	bus: { bn: 'বাসে সরাসরি', en: 'Direct by Bus' },
	cng: { bn: 'সিএনজিতে সরাসরি', en: 'Direct by CNG' },
	rickshaw: { bn: 'রিকশায় সরাসরি', en: 'Direct by Rickshaw' },
	bike: { bn: 'বাইকে সরাসরি', en: 'Direct by Bike' },
	walk: { bn: 'হেঁটে গন্তব্যে', en: 'On foot' }
};

function accessMinutes(km, mode) {
	const speed = mode === 'rickshaw' ? MODE_SPEED_KMH.rickshaw : mode === 'bus' ? MODE_SPEED_KMH.bus : WALKING_SPEED_KMH;
	return (km / speed) * 60;
}

function busFare(distanceKm) {
	return Math.max(FARE.BUS_MIN_FARE_TAKA, Math.round(distanceKm * FARE.BUS_PER_KM_TAKA));
}

function cngFare(distanceKm) {
	if (distanceKm <= FARE.CNG_BASE_KM) {
		return FARE.CNG_BASE_TAKA;
	}

	return Math.round(FARE.CNG_BASE_TAKA + (distanceKm - FARE.CNG_BASE_KM) * FARE.CNG_PER_KM_TAKA);
}

function withP90(mode, p50) {
	const ratio = P90_RATIO[mode] ?? 1.3;
	return Math.round(p50 * ratio);
}

function round1(value) {
	return Math.round(value * 10) / 10;
}

// Real distance along a real MRT-6 station path
function sumPathKm(points) {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += distance(
			{ lat: points[i - 1][0], lng: points[i - 1][1] },
			{ lat: points[i][0], lng: points[i][1] }
		);
	}

	return total;
}

// Builds a Metro-based multi-modal option with specified access and egress modes
async function buildMetroVariant(graph, origin, destination, fromMode, toMode, variantId) {
	const fromStation = nearestMetroStation(graph, origin, distance);
	const toStation = nearestMetroStation(graph, destination, distance);

	if (!fromStation || !toStation || fromStation.nodeId === toStation.nodeId) {
		return null;
	}

	// Maximum access radius
	const maxRadius = fromMode === 'bus' || toMode === 'bus' ? METRO_ACCESS_RADIUS_KM * 2 : METRO_ACCESS_RADIUS_KM;
	if (fromStation.km > maxRadius || toStation.km > maxRadius) {
		return null;
	}

	const path = metroPath(graph, fromStation.nodeId, toStation.nodeId);
	if (!path) {
		return null;
	}

	const fromAccessMin = accessMinutes(fromStation.km, fromMode) + (fromMode === 'bus' ? MODE_WAIT_MINUTES.bus : fromMode === 'rickshaw' ? 2 : 0);
	const toAccessMin = accessMinutes(toStation.km, toMode);
	const rideMin = path.minutes + MODE_WAIT_MINUTES.metro;

	const p50 = Math.round(fromAccessMin + rideMin + toAccessMin);

	const metroPts = [[fromStation.coords.lat, fromStation.coords.lng]];
	for (const edge of path.edges) {
		const node = graph.nodes.get(edge.to);
		const lat = Number(node?.metadata?.lat);
		const lng = Number(node?.metadata?.lng);
		if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
			metroPts.push([lat, lng]);
		}
	}

	let accessFare = 0;
	if (fromMode === 'bus') {
		accessFare += busFare(fromStation.km);
	} else if (fromMode === 'rickshaw') {
		accessFare = null; // unmetered rickshaw fare varies
	}

	if (toMode === 'bus') {
		if (accessFare !== null) accessFare += busFare(toStation.km);
	} else if (toMode === 'rickshaw') {
		accessFare = null;
	}

	const [fromAccessOsrm, toAccessOsrm] = await Promise.all([
		fetchOsrmRoute(fromMode, origin, fromStation.coords),
		fetchOsrmRoute(toMode, toStation.coords, destination)
	]);

	const totalDistanceKm = round1(
		(fromAccessOsrm?.distanceKm ?? fromStation.km) +
		sumPathKm(metroPts) +
		(toAccessOsrm?.distanceKm ?? toStation.km)
	);

	const totalFare = accessFare === null ? null : path.fareTaka + accessFare;

	return {
		id: variantId,
		p50,
		p90: withP90('metro', p50),
		fare: totalFare,
		distanceKm: totalDistanceKm,
		segments: [
			{
				mode: fromMode,
				min: Math.round(fromAccessMin),
				fare: fromMode === 'bus' ? busFare(fromStation.km) : fromMode === 'walk' ? 0 : null,
				label: ACCESS_LABEL[fromMode] || { bn: `${fromMode}-এ স্টেশনে`, en: `${fromMode} to station` },
				pts: fromAccessOsrm?.geometry || [[origin.lat, origin.lng], [fromStation.coords.lat, fromStation.coords.lng]]
			},
			{
				mode: 'metro',
				min: Math.round(rideMin),
				fare: path.fareTaka,
				label: { bn: 'মেট্রোতে গন্তব্যের স্টেশনে', en: 'Metro to destination station' },
				pts: metroPts
			},
			{
				mode: toMode,
				min: Math.round(toAccessMin),
				fare: toMode === 'bus' ? busFare(toStation.km) : toMode === 'walk' ? 0 : null,
				label: ACCESS_LABEL[toMode] || { bn: `${toMode}-এ গন্তব্যে`, en: `${toMode} to destination` },
				pts: toAccessOsrm?.geometry || [[toStation.coords.lat, toStation.coords.lng], [destination.lat, destination.lng]]
			}
		]
	};
}

// Direct single-mode road route
async function buildDirectOption(mode, origin, destination) {
	const osrm = await fetchOsrmRoute(mode, origin, destination);
	if (!osrm) {
		return null;
	}

	const rideMin = (osrm.distanceKm / MODE_SPEED_KMH[mode]) * 60;
	const p50 = Math.round(rideMin + MODE_WAIT_MINUTES[mode]);

	let fare = null;
	if (mode === 'bus') {
		fare = busFare(osrm.distanceKm);
	} else if (mode === 'cng') {
		fare = cngFare(osrm.distanceKm);
	} else if (mode === 'walk') {
		fare = 0;
	}

	return {
		id: `direct_${mode}`,
		p50,
		p90: withP90(mode, p50),
		fare,
		distanceKm: round1(osrm.distanceKm),
		segments: [
			{
				mode,
				min: p50,
				fare,
				label: DIRECT_LABEL[mode] || { bn: `${mode}-এ`, en: `By ${mode}` },
				pts: osrm.geometry
			}
		]
	};
}

export async function computeDynamicRouteOptions({
	originLat,
	originLng,
	destinationLat,
	destinationLng,
	preference = PREFERENCES.FASTEST,
	allowedModes = ['metro', 'bus', 'rickshaw', 'cng', 'walk']
}) {
	const graph = await ensureGraphCache();
	const origin = { lat: originLat, lng: originLng };
	const destination = { lat: destinationLat, lng: destinationLng };

	const allowedModesSet = new Set(
		Array.isArray(allowedModes) && allowedModes.length > 0
			? allowedModes
			: ['metro', 'bus', 'rickshaw', 'cng', 'walk']
	);

	const directDistanceKm = distance(origin, destination);
	const candidatePromises = [];

	// 1. Metro Multi-Modal Combinations
	if (allowedModesSet.has('metro')) {
		// Walking access + egress (Walk -> Metro -> Walk)
		if (allowedModesSet.has('walk')) {
			candidatePromises.push(
				buildMetroVariant(graph, origin, destination, 'walk', 'walk', 'metro_walk')
			);
		}

		// Rickshaw access + egress (Rickshaw -> Metro -> Rickshaw)
		if (allowedModesSet.has('rickshaw')) {
			candidatePromises.push(
				buildMetroVariant(
					graph,
					origin,
					destination,
					'rickshaw',
					allowedModesSet.has('walk') ? 'walk' : 'rickshaw',
					'metro_rickshaw'
				)
			);
		}

		// Bus to Metro connection (Bus -> Metro -> Walk/Rickshaw)
		if (allowedModesSet.has('bus') && directDistanceKm > 2.5) {
			const egressMode = allowedModesSet.has('walk') ? 'walk' : allowedModesSet.has('rickshaw') ? 'rickshaw' : 'bus';
			candidatePromises.push(
				buildMetroVariant(graph, origin, destination, 'bus', egressMode, 'bus_metro')
			);
		}
	}

	// 2. Direct Road Options
	const directModes = ['bus', 'cng', 'rickshaw', 'bike', 'walk'];
	for (const mode of directModes) {
		if (allowedModesSet.has(mode)) {
			// Skip pure walk if distance is excessively far (> 4 km) unless walk is the only allowed mode
			if (mode === 'walk' && directDistanceKm > 4 && allowedModesSet.size > 1) {
				continue;
			}
			candidatePromises.push(buildDirectOption(mode, origin, destination));
		}
	}

	const rawResults = await Promise.all(candidatePromises);
	const rawOptions = rawResults.filter(Boolean);

	// 3. Rank options using the preference scoring layer
	const rankedOptions = rankRoutesByPreference(rawOptions, preference);

	return {
		preference,
		options: rankedOptions
	};
}

