import { ensureGraphCache } from '../cache/graph.cache.js';
import { metroPath, nearestMetroStation } from '../core/algorithms/metroPath.js';
import { fetchOsrmRoute } from './osrm.client.js';
import { distance } from '../utils/distance.js';
import { config } from '../constants/config.js';

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
	rickshaw: { bn: 'রিকশায় স্টেশনে', en: 'Rickshaw to station' }
};

const DIRECT_LABEL = {
	bus: { bn: 'বাসে', en: 'By bus' },
	cng: { bn: 'সিএনজিতে', en: 'By CNG' },
	rickshaw: { bn: 'রিকশায়', en: 'By rickshaw' },
	bike: { bn: 'বাইকে', en: 'By bike' },
	walk: { bn: 'হেঁটে', en: 'On foot' }
};

function accessMode(km) {
	return km > ACCESS_WALK_LIMIT_KM ? 'rickshaw' : 'walk';
}

function accessMinutes(km, mode) {
	const speed = mode === 'rickshaw' ? MODE_SPEED_KMH.rickshaw : WALKING_SPEED_KMH;
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

// Real distance along a real MRT-6 station path — haversine between each
// consecutive pair of the path's actual station coordinates, not a
// straight origin-to-destination line.
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

// Metro option: nearest real station to each point, a real dijkstra path
// (and real cumulative fare) between them, plus real access legs on each
// end. Returns null if either point is too far from a station, both
// resolve to the same station, or no metro path exists between them.
async function buildMetroOption(graph, origin, destination) {
	const fromStation = nearestMetroStation(graph, origin, distance);
	const toStation = nearestMetroStation(graph, destination, distance);

	if (!fromStation || !toStation || fromStation.nodeId === toStation.nodeId) {
		return null;
	}

	if (fromStation.km > METRO_ACCESS_RADIUS_KM || toStation.km > METRO_ACCESS_RADIUS_KM) {
		return null;
	}

	const path = metroPath(graph, fromStation.nodeId, toStation.nodeId);
	if (!path) {
		return null;
	}

	const fromMode = accessMode(fromStation.km);
	const toMode = accessMode(toStation.km);
	const fromAccessMin = accessMinutes(fromStation.km, fromMode);
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

	const accessFare = fromMode === 'rickshaw' || toMode === 'rickshaw' ? null : 0;

	// Access legs are short, but still real road/footpath hops, not a drawn
	// straight line — same OSRM call the direct options use. Falls back to
	// the straight two-point line only if OSRM can't resolve this short hop.
	const [fromAccessOsrm, toAccessOsrm] = await Promise.all([
		fetchOsrmRoute(fromMode, origin, fromStation.coords),
		fetchOsrmRoute(toMode, toStation.coords, destination)
	]);

	// Real distance end to end: road-snapped access legs (or their straight-
	// line haversine fallback — fromStation.km/toStation.km, already computed
	// by nearestMetroStation) plus the real distance along the MRT-6 path's
	// own station coordinates.
	const totalDistanceKm = round1(
		(fromAccessOsrm?.distanceKm ?? fromStation.km) +
		sumPathKm(metroPts) +
		(toAccessOsrm?.distanceKm ?? toStation.km)
	);

	return {
		id: 'metro',
		p50,
		p90: withP90('metro', p50),
		fare: accessFare === null ? null : path.fareTaka,
		distanceKm: totalDistanceKm,
		segments: [
			{
				mode: fromMode,
				min: Math.round(fromAccessMin),
				fare: fromMode === 'walk' ? 0 : null,
				label: ACCESS_LABEL[fromMode],
				pts: fromAccessOsrm?.geometry || [[origin.lat, origin.lng], [fromStation.coords.lat, fromStation.coords.lng]]
			},
			{
				mode: 'metro',
				min: Math.round(rideMin),
				fare: path.fareTaka,
				label: { bn: 'মেট্রোতে গন্তব্যে', en: 'Metro to destination' },
				pts: metroPts
			},
			{
				mode: toMode,
				min: Math.round(toAccessMin),
				fare: toMode === 'walk' ? 0 : null,
				label: ACCESS_LABEL[toMode],
				pts: toAccessOsrm?.geometry || [[toStation.coords.lat, toStation.coords.lng], [destination.lat, destination.lng]]
			}
		]
	};
}

// A direct option (no metro) for one road mode: real OSRM road-snapped
// distance and geometry, time from our own per-mode speed constants (OSRM's
// driving duration is free-flow car speed, not Dhaka's actual pace for that
// mode), fare from a real published rate where one exists. Returns null if
// OSRM can't resolve a road route between the two points.
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
	// rickshaw and bike: no official fixed rate — fare stays null ("varies").

	return {
		id: mode,
		p50,
		p90: withP90(mode, p50),
		fare,
		distanceKm: round1(osrm.distanceKm),
		segments: [
			{
				mode,
				min: p50,
				fare,
				label: DIRECT_LABEL[mode],
				pts: osrm.geometry
			}
		]
	};
}

export async function computeDynamicRouteOptions({ originLat, originLng, destinationLat, destinationLng }) {
	const graph = await ensureGraphCache();
	const origin = { lat: originLat, lng: originLng };
	const destination = { lat: destinationLat, lng: destinationLng };

	const directDistanceKm = distance(origin, destination);
	// A pure-walk option only makes sense for a short trip.
	const candidateModes = directDistanceKm <= 3 ? ['bus', 'cng', 'rickshaw', 'bike', 'walk'] : ['bus', 'cng', 'rickshaw', 'bike'];

	const [metroOption, ...directOptions] = await Promise.all([
		buildMetroOption(graph, origin, destination),
		...candidateModes.map((mode) => buildDirectOption(mode, origin, destination))
	]);

	const options = [metroOption, ...directOptions].filter(Boolean);
	return { options };
}
