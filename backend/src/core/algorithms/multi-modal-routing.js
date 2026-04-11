import { dijkstra } from './dijkstra.js';
import { modeSwitchCost } from './mode-switch-cost.js';
import { distance } from '../../utils/distance.js';

const modeDisplayNames = {
  walk: 'walk',
  bike: 'rickshaw',
  rickshaw: 'rickshaw',
  'three-wheeler': 'three-wheeler',
  bus: 'motorized',
  metro: 'motorized',
  motorized: 'motorized'
};

function expandPreferredModes(preferredModes = []) {
  const expanded = new Set();

  for (const mode of preferredModes) {
    if (mode === 'motorized') {
      expanded.add('bus');
      expanded.add('metro');
      continue;
    }

    if (mode === 'rickshaw' || mode === 'three-wheeler') {
      expanded.add('bike');
      continue;
    }

    expanded.add(mode);
  }

  return expanded;
}

function extractVehicleType(edge, requestedVehicleType) {
  if (requestedVehicleType) {
    return requestedVehicleType;
  }

  const preferredOrder = ['pedestrian', 'bicycle', 'bus', 'metro', 'car'];
  for (const vehicleType of preferredOrder) {
    if (edge.allowedVehicles.has(vehicleType)) {
      return vehicleType;
    }
  }

  return null;
}

function extractCoordinates(graph, nodeId) {
  const node = graph.nodes.get(nodeId);
  const metadata = node?.metadata || {};

  if (typeof metadata.latitude === 'number' && typeof metadata.longitude === 'number') {
    return { lat: metadata.latitude, lng: metadata.longitude };
  }

  if (typeof metadata.lat === 'number' && typeof metadata.lng === 'number') {
    return { lat: metadata.lat, lng: metadata.lng };
  }

  if (typeof metadata.x === 'number' && typeof metadata.y === 'number') {
    return { lat: metadata.x, lng: metadata.y };
  }

  return null;
}

function extractNodeLabel(graph, nodeId) {
  const metadata = graph.nodes.get(nodeId)?.metadata || {};
  return metadata.displayName || metadata.label || nodeId;
}

function legDistanceKm(graph, fromNodeId, toNodeId) {
  const from = extractCoordinates(graph, fromNodeId);
  const to = extractCoordinates(graph, toNodeId);

  if (!from || !to) {
    return 0;
  }

  return distance(from, to);
}

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
  requireStableHopWhenDynamicEndpoints = false,
  vehicleType = null,
  timeoutMs = 2500
}) {
  const blockedModes = new Set(avoidModes);
  const allowedModes = expandPreferredModes(preferredModes.filter((mode) => !blockedModes.has(mode)));

  const originIsDynamic = Boolean(graph.nodes.get(origin)?.metadata?.dynamic);
  const destinationIsDynamic = Boolean(graph.nodes.get(destination)?.metadata?.dynamic);
  const enforceStableHop =
    requireStableHopWhenDynamicEndpoints && originIsDynamic && destinationIsDynamic;

  const neighbors = (state) => {
    return graph
      .getNeighbors(state.node)
      .filter((edge) => !(enforceStableHop && state.node === origin && edge.to === destination))
      .filter((edge) => allowedModes.has(edge.mode))
      .filter((edge) => edge.isAccessibleByVehicle(vehicleType))
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
    fromLabel: extractNodeLabel(graph, edge.from),
    to: edge.to,
    toLabel: extractNodeLabel(graph, edge.to),
    mode: edge.mode,
    transportMode: modeDisplayNames[edge.mode] || edge.mode,
    vehicleType: extractVehicleType(edge, vehicleType),
    weight: edge.currentWeight,
    distanceKm: legDistanceKm(graph, edge.from, edge.to)
  }));

  const totalDistanceKm = Number(
    legs.reduce((sum, leg) => sum + (Number(leg.distanceKm) || 0), 0).toFixed(3)
  );

  const totalSwitchPenalty = legs.reduce((sum, leg, index) => {
    if (index === 0) {
      return sum;
    }

    const previousLeg = legs[index - 1];
    return sum + modeSwitchCost(previousLeg.mode, leg.mode);
  }, 0);

  const pathNodes = [origin, ...legs.map((leg) => leg.to)];
  const pathCoordinates = pathNodes.map((nodeId) => ({
    nodeId,
    coordinates: extractCoordinates(graph, nodeId)
  }));
  const pathNodeDetails = pathNodes.map((nodeId) => ({
    nodeId,
    label: extractNodeLabel(graph, nodeId),
    coordinates: extractCoordinates(graph, nodeId)
  }));

  if (enforceStableHop) {
    const hasStableIntermediateHop = pathNodes
      .slice(1, -1)
      .some((nodeId) => !graph.nodes.get(nodeId)?.metadata?.dynamic);

    if (!hasStableIntermediateHop) {
      return null;
    }
  }

  return {
    origin,
    originLabel: extractNodeLabel(graph, origin),
    destination,
    destinationLabel: extractNodeLabel(graph, destination),
    totalCost: run.distances.get(stateKey(run.goalState)),
    totalDistanceKm,
    legs,
    pathNodes,
    pathNodeDetails,
    pathCoordinates,
    totalSwitchPenalty,
    timedOut: false
  };
}