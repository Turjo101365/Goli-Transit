import test from 'node:test';
import assert from 'node:assert/strict';
import { Graph } from '../../src/core/graph-engine/graph.js';
import { Edge } from '../../src/core/graph-engine/edge.js';
import { multiModalRouting } from '../../src/core/algorithms/multi-modal-routing.js';

test('edge access respects public transport aliases and blocks car-only traversal by default', () => {
	const edge = new Edge('A', 'B', 'bus', 4);
	edge.allowedVehicles.add('bus');

	assert.equal(edge.isAccessibleByVehicle(null), true);
	assert.equal(edge.isAccessibleByVehicle('motorized'), true);
	assert.equal(edge.isAccessibleByVehicle('car'), false);
});

test('multi-modal routing returns transport metadata and switch penalty', () => {
	const graph = new Graph();
	graph.addNode('A', { latitude: 23.7925, longitude: 90.4078 });
	graph.addNode('B', { latitude: 23.7937, longitude: 90.4066 });
	graph.addNode('C', { latitude: 23.7580, longitude: 90.3890 });

	const walk = graph.addEdge('A', 'B', 'walk', 5);
	walk.allowedVehicles.add('pedestrian');

	const bus = graph.addEdge('B', 'C', 'bus', 7);
	bus.allowedVehicles.add('bus');

	const result = multiModalRouting({
		graph,
		origin: 'A',
		destination: 'C',
		preferredModes: ['walk', 'bus', 'motorized'],
		avoidModes: [],
		vehicleType: null,
		timeoutMs: 1000
	});

	assert.ok(result);
	assert.equal(result.timedOut, false);
	assert.deepEqual(result.pathNodes, ['A', 'B', 'C']);
	assert.equal(result.legs.length, 2);
	assert.equal(result.legs[0].transportMode, 'walk');
	assert.equal(result.legs[1].transportMode, 'motorized');
	assert.equal(result.totalSwitchPenalty, 3);
	assert.ok(typeof result.totalDistanceKm === 'number');
	assert.ok(result.totalDistanceKm > 0);
	assert.ok(typeof result.legs[0].distanceKm === 'number');
	assert.ok(result.legs[0].distanceKm > 0);
});

test('route realism guard blocks direct dynamic-to-dynamic shortcut', () => {
	const graph = new Graph();

	graph.addNode('dyn_A', { dynamic: true, label: 'Dynamic A' });
	graph.addNode('dyn_B', { dynamic: true, label: 'Dynamic B' });
	graph.addNode('S1', { dynamic: false, label: 'Stable 1' });

	const direct = graph.addEdge('dyn_A', 'dyn_B', 'walk', 1);
	direct.allowedVehicles.add('pedestrian');

	const toStable = graph.addEdge('dyn_A', 'S1', 'walk', 3);
	toStable.allowedVehicles.add('pedestrian');

	const fromStable = graph.addEdge('S1', 'dyn_B', 'walk', 3);
	fromStable.allowedVehicles.add('pedestrian');

	const guarded = multiModalRouting({
		graph,
		origin: 'dyn_A',
		destination: 'dyn_B',
		preferredModes: ['walk'],
		avoidModes: [],
		requireStableHopWhenDynamicEndpoints: true,
		vehicleType: null,
		timeoutMs: 1000
	});

	assert.ok(guarded);
	assert.deepEqual(guarded.pathNodes, ['dyn_A', 'S1', 'dyn_B']);
	assert.equal(guarded.legs.length, 2);
});