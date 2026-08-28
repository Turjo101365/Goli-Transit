import { MinHeap } from './minHeap.js';

export function dijkstra({ start, isGoal, neighbors, keyOf, timeoutMs = 2500 }) {
  const startedAt = Date.now();
  const distances = new Map();
  const parents = new Map();
  const queue = new MinHeap((a, b) => a.distance - b.distance);

  distances.set(keyOf(start), 0);
  queue.push({ state: start, distance: 0 });

  while (!queue.isEmpty()) {
    if (Date.now() - startedAt > timeoutMs) {
      return { distances, parents, goalState: null, timedOut: true };
    }

    const current = queue.pop();
    const currentKey = keyOf(current.state);

    if (current.distance > (distances.get(currentKey) ?? Infinity)) {
      continue;
    }

    if (isGoal(current.state)) {
      return { distances, parents, goalState: current.state, timedOut: false };
    }

    for (const option of neighbors(current.state)) {
      const nextDistance = current.distance + option.cost;
      const nextKey = keyOf(option.state);

      if (nextDistance < (distances.get(nextKey) ?? Infinity)) {
        distances.set(nextKey, nextDistance);
        parents.set(nextKey, {
          previousKey: currentKey,
          via: option.via,
          state: option.state
        });
        queue.push({ state: option.state, distance: nextDistance });
      }
    }
  }

  return { distances, parents, goalState: null, timedOut: false };
}
