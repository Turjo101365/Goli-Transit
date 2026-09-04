import { ensureGraphCache } from '../cache/graph.cache.js';
import { astarMetroPath, nearestMetroStation, nodeCoords } from '../core/algorithms/metroPath.js';
import { distance } from '../utils/distance.js';
import { config } from '../constants/config.js';
import { getFareRules, calculateMetroFare } from './fare.service.js';

const { METRO_ACCESS_RADIUS_KM } = config.journey;

// Real A* search over the real MRT-6 station graph, for a caller to replay
// as an animation — see docs/API.md "POST /route/simulate".
export async function simulateAstarRoute({ originLat, originLng, destinationLat, destinationLng }) {
	const [graph, fareRules] = await Promise.all([
		ensureGraphCache(),
		getFareRules()
	]);
	const origin = { lat: originLat, lng: originLng };
	const destination = { lat: destinationLat, lng: destinationLng };

	const fromStation = nearestMetroStation(graph, origin, distance);
	const toStation = nearestMetroStation(graph, destination, distance);

	if (!fromStation || !toStation || fromStation.nodeId === toStation.nodeId) {
		return { possible: false };
	}

	if (fromStation.km > METRO_ACCESS_RADIUS_KM || toStation.km > METRO_ACCESS_RADIUS_KM) {
		return { possible: false };
	}

	const result = astarMetroPath(graph, fromStation.nodeId, toStation.nodeId);
	if (!result) {
		return { possible: false };
	}

	const stations = [];
	for (const [nodeId, node] of graph.nodes.entries()) {
		if (node?.metadata?.type !== 'metro_station') {
			continue;
		}

		const coords = nodeCoords(node);
		if (!coords) {
			continue;
		}

		stations.push({
			id: nodeId,
			nameBn: node.metadata.nameBn || nodeId,
			nameEn: node.metadata.nameEn || nodeId,
			lat: coords.lat,
			lng: coords.lng
		});
	}

	let metroKm = 0;
	let prevCoords = fromStation.coords;
	for (const edge of result.edges) {
		const node = graph.nodes.get(edge.to);
		const coords = nodeCoords(node);
		if (coords && prevCoords) {
			metroKm += distance(prevCoords, coords);
			prevCoords = coords;
		}
	}
	const computedFare = calculateMetroFare(metroKm, result.fareTaka, fareRules);

	const path = [fromStation.nodeId, ...result.edges.map((edge) => edge.to)];

	return {
		possible: true,
		fromStationId: fromStation.nodeId,
		toStationId: toStation.nodeId,
		stations,
		path,
		trace: result.trace,
		minutes: result.minutes,
		fareTaka: computedFare
	};
}
