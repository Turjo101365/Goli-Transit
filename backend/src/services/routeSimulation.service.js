import { ensureGraphCache } from '../cache/graph.cache.js';
import { astarMetroPath, nearestMetroStation, nodeCoords } from '../core/algorithms/metroPath.js';
import { distance } from '../utils/distance.js';
import { config } from '../constants/config.js';

const { METRO_ACCESS_RADIUS_KM } = config.journey;

// Real A* search over the real MRT-6 station graph, for a caller to replay
// as an animation — see docs/API.md "POST /route/simulate". `possible:
// false` (not a thrown error, not a bare null) when either point is too
// far from any station or no metro path exists, so the route computes
// gracefully falls back the same way dynamicRoute.service.js does
// elsewhere — and so apiRequest's `payload?.data ?? payload` unwrapping on
// the frontend can't mistake a real "no" for "no data at all" the way a
// bare `data: null` would (null is nullish, so `??` would fall through to
// the whole envelope instead of the null).
export async function simulateAstarRoute({ originLat, originLng, destinationLat, destinationLng }) {
	const graph = await ensureGraphCache();
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

	const path = [fromStation.nodeId, ...result.edges.map((edge) => edge.to)];

	return {
		possible: true,
		fromStationId: fromStation.nodeId,
		toStationId: toStation.nodeId,
		stations,
		path,
		trace: result.trace,
		minutes: result.minutes,
		fareTaka: result.fareTaka
	};
}
