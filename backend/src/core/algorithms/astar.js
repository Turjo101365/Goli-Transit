import { MinHeap } from './minHeap.js';

// A* — Dijkstra with a heuristic steering the search toward the goal.
// Same neighbours/cost contract as dijkstra.js, plus `heuristic(state)`:
// an estimated remaining cost from `state` to the goal. Must be
// admissible (never overestimate) for the result to stay optimal —
// metroPath.js's astarMetroPath uses real great-circle distance divided
// by the metro's real top speed, which can only ever underestimate the
// true travel time (the line isn't straight, and it stops).
//
// Returns everything dijkstra() does, plus `trace`: an ordered log of
// every node the search touched (its g/h/f at that moment, and whether
// it was newly queued ("frontier") or popped for expansion ("visit")) —
// this is the recording a caller replays to animate the search, not
// something invented after the fact.
export function astar({ start, isGoal, neighbors, heuristic, keyOf, timeoutMs = 2500 }) {
	const startedAt = Date.now();
	const gScores = new Map();
	const parents = new Map();
	const queue = new MinHeap((a, b) => a.f - b.f);
	const trace = [];
	let order = 0;

	const startKey = keyOf(start);
	const startH = heuristic(start);
	gScores.set(startKey, 0);
	queue.push({ state: start, g: 0, f: startH });
	trace.push({ order: order++, key: startKey, g: 0, h: startH, f: startH, action: 'frontier' });

	while (!queue.isEmpty()) {
		if (Date.now() - startedAt > timeoutMs) {
			return { gScores, parents, goalState: null, timedOut: true, trace };
		}

		const current = queue.pop();
		const currentKey = keyOf(current.state);

		if (current.g > (gScores.get(currentKey) ?? Infinity)) {
			continue; // stale queue entry — a cheaper path to this node was already found
		}

		trace.push({ order: order++, key: currentKey, g: current.g, h: current.f - current.g, f: current.f, action: 'visit' });

		if (isGoal(current.state)) {
			return { gScores, parents, goalState: current.state, timedOut: false, trace };
		}

		for (const option of neighbors(current.state)) {
			const nextG = current.g + option.cost;
			const nextKey = keyOf(option.state);

			if (nextG < (gScores.get(nextKey) ?? Infinity)) {
				gScores.set(nextKey, nextG);
				parents.set(nextKey, {
					previousKey: currentKey,
					via: option.via,
					state: option.state
				});

				const h = heuristic(option.state);
				const f = nextG + h;
				queue.push({ state: option.state, g: nextG, f });
				trace.push({ order: order++, key: nextKey, g: nextG, h, f, action: 'frontier' });
			}
		}
	}

	return { gScores, parents, goalState: null, timedOut: false, trace };
}
