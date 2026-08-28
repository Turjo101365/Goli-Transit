import { dijkstra } from './dijkstra.js';
import { astar } from './astar.js';
import { distance } from '../../utils/distance.js';
import { config } from '../../constants/config.js';

const METRO_SPEED_KMH = config.journey.MODE_SPEED_KMH.metro;

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

// Same real shortest path as metroPath(), but via A* — a real heuristic
// (great-circle distance from the station being considered to the
// destination, divided by the metro's real top speed) steers the search
// toward the goal instead of expanding uniformly outward like Dijkstra.
// Admissible because the real line is never straighter or faster than
// that estimate (it curves and stops), so the result is still optimal —
// A* just reaches it having looked at fewer/same nodes, in a different
// order. Returns everything metroPath() does, plus `trace`: the ordered
// record of every station the search actually touched, for a caller to
// replay as an animation (see routeSimulation.service.js).
export function astarMetroPath(graph, fromId, toId) {
	if (!graph.hasNode(fromId) || !graph.hasNode(toId)) {
		return null;
	}

	if (fromId === toId) {
		return { minutes: 0, fareTaka: 0, edges: [], trace: [] };
	}

	const destCoords = nodeCoords(graph.nodes.get(toId));

	const result = astar({
		start: fromId,
		isGoal: (state) => state === toId,
		neighbors: (state) =>
			graph
				.getNeighbors(state)
				.filter((edge) => edge.mode === 'metro')
				.map((edge) => ({ state: edge.to, cost: edge.currentWeight, via: edge })),
		heuristic: (state) => {
			if (!destCoords) {
				return 0; // no real coordinates to estimate from — falls back to Dijkstra-equivalent behaviour
			}

			const coords = nodeCoords(graph.nodes.get(state));
			if (!coords) {
				return 0;
			}

			return (distance(coords, destCoords) / METRO_SPEED_KMH) * 60;
		},
		keyOf: (state) => state,
		timeoutMs: 1000
	});

	if (result.timedOut || !result.goalState) {
		return null;
	}

	const minutes = result.gScores.get(toId);
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

	return { minutes, fareTaka, edges, trace: result.trace };
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
