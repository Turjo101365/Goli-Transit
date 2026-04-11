import { anomalyEvent } from '../events/anomaly.event.js';
import { eventEmitter } from '../events/event-emitter.js';
import { graphBuilder } from '../core/graph-engine/graph-builder.js';
import { graphLoader } from '../modules/graph/graph.loader.js';
import { redisClient } from './redis.client.js';
import { redisConfig } from '../config/redis.js';
import { Graph } from '../core/graph-engine/graph.js';

const GRAPH_CACHE_KEY = 'graph-cache:v2:snapshot';

export const graphCache = {
	graph: null,
	snapshot: null,
	lastUpdatedAt: null,
	lastAnomaly: null,
	source: 'memory'
};

function timestamp() {
	return new Date().toISOString();
}

function graphFromSnapshot(snapshot) {
	if (!snapshot) {
		return null;
	}

	const graph = new Graph();

	for (const nodeEntry of snapshot.nodes || []) {
		if (typeof nodeEntry === 'string') {
			graph.addNode(nodeEntry, {});
			continue;
		}

		if (nodeEntry && typeof nodeEntry === 'object' && nodeEntry.id) {
			graph.addNode(nodeEntry.id, nodeEntry.metadata || {});
		}
	}

	for (const edgeData of snapshot.edges || []) {
		const edge = graph.addEdge(edgeData.from, edgeData.to, edgeData.mode, Number(edgeData.baseWeight));
		edge.currentWeight = Number(edgeData.currentWeight);
		for (const vehicle of edgeData.allowedVehicles || []) {
			edge.allowedVehicles.add(vehicle);
		}
	}

	return graph;
}

async function persistSnapshot(snapshot) {
	await redisClient.setJson(GRAPH_CACHE_KEY, snapshot, redisConfig.graphTtlSeconds);
}

export async function ensureGraphCache() {
	if (!graphCache.graph) {
		const redisSnapshot = await redisClient.getJson(GRAPH_CACHE_KEY);
		if (redisSnapshot) {
			graphCache.graph = graphFromSnapshot(redisSnapshot);
			graphCache.snapshot = redisSnapshot;
			graphCache.lastUpdatedAt = timestamp();
			graphCache.source = 'redis';
			return graphCache.graph;
		}

		graphCache.graph = await graphLoader();
		if (!graphCache.graph) {
			graphCache.graph = graphBuilder();
			graphCache.source = 'seed';
		} else {
			graphCache.source = 'database';
		}

		graphCache.snapshot = graphCache.graph.snapshot();
		graphCache.lastUpdatedAt = timestamp();
		await persistSnapshot(graphCache.snapshot);
	}

	return graphCache.graph;
}

export async function refreshGraphSnapshot() {
	const graph = await ensureGraphCache();
	graphCache.snapshot = graph.snapshot();
	graphCache.lastUpdatedAt = timestamp();
	await persistSnapshot(graphCache.snapshot);
	return graphCache.snapshot;
}

export async function invalidateGraphCache() {
	graphCache.graph = null;
	graphCache.snapshot = null;
	graphCache.lastUpdatedAt = null;
	graphCache.lastAnomaly = null;
	await redisClient.delete(GRAPH_CACHE_KEY);
}

export function updateGraphCacheForAnomaly(appliedEdges, anomalyPayload) {
	if (!graphCache.snapshot) {
		graphCache.snapshot = graphCache.graph ? graphCache.graph.snapshot() : null;
	}

	if (!graphCache.snapshot) {
		return null;
	}

	const appliedMap = new Map(
		appliedEdges.map((entry) => [`${entry.from}|${entry.to}|${entry.mode}`, entry.updatedWeight])
	);

	graphCache.snapshot = {
		...graphCache.snapshot,
		edges: graphCache.snapshot.edges.map((edge) => {
			const key = `${edge.from}|${edge.to}|${edge.mode}`;

			if (!appliedMap.has(key)) {
				return edge;
			}

			return {
				...edge,
				currentWeight: appliedMap.get(key)
			};
		})
	};

	graphCache.lastAnomaly = anomalyPayload;
	graphCache.lastUpdatedAt = timestamp();
	void persistSnapshot(graphCache.snapshot);
	return graphCache.snapshot;
}

void ensureGraphCache();

eventEmitter.on(anomalyEvent, ({ anomaly, applied }) => {
	updateGraphCacheForAnomaly(applied, anomaly);
});