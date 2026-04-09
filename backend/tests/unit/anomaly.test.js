import test from 'node:test';
import assert from 'node:assert/strict';
import { anomalyService } from '../../src/services/anomaly.service.js';
import { routeService } from '../../src/services/route.service.js';
import { ensureGraphCache, refreshGraphSnapshot } from '../../src/cache/graph.cache.js';

test('anomaly update changes only affected edge and reroutes traffic', async () => {
  const graph = await ensureGraphCache();
  const initialSnapshot = await refreshGraphSnapshot();
  const initialEdge = initialSnapshot.edges.find((edge) => edge.from === 'B' && edge.to === 'C');
  assert.equal(initialEdge.currentWeight, 4);

  const initialRoute = await routeService({
    origin: 'A',
    destination: 'C',
    preferredModes: ['walk', 'bike', 'bus', 'metro'],
    avoidModes: [],
    vehicleType: null
  });

  assert.deepEqual(initialRoute.legs.map((leg) => `${leg.from}->${leg.to}`), ['A->B', 'B->C']);

  const anomalyResult = await anomalyService({
    type: 'EDGE_WEIGHT_MULTIPLIER',
    reason: 'traffic congestion on B-C',
    affectedEdges: [
      {
        from: 'B',
        to: 'C',
        multiplier: 4
      }
    ]
  });

  assert.equal(anomalyResult.appliedCount, 1);
  assert.equal(anomalyResult.graphUpdated, true);
  assert.equal(anomalyResult.applied[0].updatedWeight, 16);

  const updatedSnapshot = await refreshGraphSnapshot();
  const updatedEdge = updatedSnapshot.edges.find((edge) => edge.from === 'B' && edge.to === 'C');
  assert.equal(updatedEdge.currentWeight, 16);

  const rerouted = await routeService({
    origin: 'A',
    destination: 'C',
    preferredModes: ['walk', 'bike', 'bus', 'metro'],
    avoidModes: [],
    vehicleType: null
  });

  assert.deepEqual(rerouted.legs.map((leg) => `${leg.from}->${leg.to}`), ['A->D', 'D->C']);
  assert.equal(graph.getEdge('B', 'C', 'bus').currentWeight, 16);
});