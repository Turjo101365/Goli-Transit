import { dijkstra } from './dijkstra.js';
import { modeSwitchCost } from './mode-switch-cost.js';

function stateKey(state) {
  return `${state.node}|${state.mode || 'null'}`;
}

function reconstructRoute(run, goalState) {
  const routeEdges = [];
  let currentKey = stateKey(goalState);

  while (run.parents.has(currentKey)) {
    const parent = run.parents.get(currentKey);
    routeEdges.push(parent.via);
    currentKey = parent.previousKey;
  }

  routeEdges.reverse();

  return routeEdges;
}

export function multiModalRouting({
  graph,
  origin,
  destination,
  preferredModes,
  avoidModes,
  vehicleType = null,
  timeoutMs = 2500
}) {
  const blockedModes = new Set(avoidModes);
  const allowedModes = new Set(preferredModes.filter((mode) => !blockedModes.has(mode)));

  const neighbors = (state) => {
    return graph
      .getNeighbors(state.node)
      .filter((edge) => allowedModes.has(edge.mode))
      .filter((edge) => !vehicleType || edge.isAccessibleByVehicle(vehicleType))
      .map((edge) => ({
        state: {
          node: edge.to,
          mode: edge.mode
        },
        via: edge,
        cost: edge.currentWeight + modeSwitchCost(state.mode, edge.mode)
      }));
  };

  const run = dijkstra({
    start: { node: origin, mode: null },
    isGoal: (state) => state.node === destination,
    neighbors,
    keyOf: stateKey,
    timeoutMs
  });

  if (run.timedOut) {
    return { timedOut: true };
  }

  if (!run.goalState) {
    return null;
  }

  const legs = reconstructRoute(run, run.goalState).map((edge) => ({
    from: edge.from,
    to: edge.to,
    mode: edge.mode,
    weight: edge.currentWeight
  }));

  return {
    origin,
    destination,
    totalCost: run.distances.get(stateKey(run.goalState)),
    legs,
    timedOut: false
  };
}