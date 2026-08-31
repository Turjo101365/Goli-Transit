import test from 'node:test';
import assert from 'node:assert/strict';
import { anomalyService } from '../../src/services/anomaly.service.js';
import { routeService } from '../../src/services/route.service.js';
import { ensureGraphCache, refreshGraphSnapshot } from '../../src/cache/graph.cache.js';

test('anomaly update changes only affected edge and reroutes traffic', async () => {
  const graph = await ensureGraphCache();
  graph.addNode('A', { latitude: 23.7925, longitude: 90.4078 });
  graph.addNode('B', { latitude: 23.7937, longitude: 90.4066 });
  graph.addNode('C', { latitude: 23.7580, longitude: 90.3890 });
  graph.addNode('D', { latitude: 23.7700, longitude: 90.3950 });
  const ab = graph.addEdge('A', 'B', 'bus', 3);
  ab.allowedVehicles.add('bus');
  const bc = graph.addEdge('B', 'C', 'bus', 4);
  bc.allowedVehicles.add('bus');
  const ad = graph.addEdge('A', 'D', 'bus', 5);
  ad.allowedVehicles.add('bus');
  const dc = graph.addEdge('D', 'C', 'bus', 5);
  dc.allowedVehicles.add('bus');

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