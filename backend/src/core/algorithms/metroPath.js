import { dijkstra } from './dijkstra.js';

export function nodeCoords(node) {
	const lat = Number(node?.metadata?.lat);
	const lng = Number(node?.metadata?.lng);
	if (Number.isNaN(lat) || Number.isNaN(lng)) {
		return null;
	}

	return { lat, lng };
}

// Shortest metro path (by minutes) from fromId to toId, with the real fare
// and per-hop edges along that same path (metro fares are a monotonic step
// function along the line, so this reproduces the real cumulative fare).
// Shared by journey.service.js (bus-vs-switch evaluation) and
// dynamicRoute.service.js (the metro option for an arbitrary origin/destination).
export function metroPath(graph, fromId, toId) {
	if (!graph.hasNode(fromId) || !graph.hasNode(toId)) {
		return null;
	}

	if (fromId === toId) {
		return { minutes: 0, fareTaka: 0, edges: [] };
	}

	const result = dijkstra({
		start: fromId,
		isGoal: (state) => state === toId,
		neighbors: (state) =>
			graph
				.getNeighbors(state)
				.filter((edge) => edge.mode === 'metro')
				.map((edge) => ({ state: edge.to, cost: edge.currentWeight, via: edge })),
		keyOf: (state) => state,
		timeoutMs: 1000
	});

	if (result.timedOut || !result.goalState) {
		return null;
	}

	const minutes = result.distances.get(toId);
	if (minutes === undefined) {
		return null;
	}

	const edges = [];
	let fareTaka = 0;
	let cursorKey = toId;
	while (cursorKey !== fromId) {
		const parentEntry = result.parents.get(cursorKey);
		if (!parentEntry) {
			return null;
		}

		fareTaka += Number(parentEntry.via.fareTaka || 0);
		edges.unshift(parentEntry.via);
		cursorKey = parentEntry.previousKey;
	}

	return { minutes, fareTaka, edges };
}

// Nearest real metro_station node to a point, with its distance in km.
// `distance` is injected (utils/distance.js) to avoid a circular import.
export function nearestMetroStation(graph, point, distanceFn) {
	let best = null;

	for (const [nodeId, node] of graph.nodes.entries()) {
		if (node?.metadata?.type !== 'metro_station') {
			continue;
		}

		const coords = nodeCoords(node);
		if (!coords) {
			continue;
		}

		const km = distanceFn(point, coords);
		if (!best || km < best.km) {
			best = { nodeId, node, coords, km };
		}
	}

	return best;
}
