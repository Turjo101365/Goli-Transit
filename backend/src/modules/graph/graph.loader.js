import { Graph } from '../../core/graph-engine/graph.js';
import { graphRepository } from '../../repositories/graph.repository.js';
import { graphBuilder } from '../../core/graph-engine/graph-builder.js';
import { logger } from '../../utils/logger.js';

const MIN_STABLE_HUBS = Number(process.env.MIN_STABLE_HUBS || 12);

function hydrateGraph(nodes, edges) {
  const graph = new Graph();

  for (const node of nodes) {
    graph.addNode(node.id, node.metadata || {});
  }

  for (const edgeRecord of edges) {
    const edge = graph.addEdge(
      edgeRecord.from,
      edgeRecord.to,
      edgeRecord.mode,
      Number(edgeRecord.baseWeight)
    );

    edge.currentWeight = Number(edgeRecord.currentWeight);
    edge.fareTaka = Number(edgeRecord.fareTaka || 0);
    for (const vehicle of edgeRecord.allowedVehicles || []) {
      edge.allowedVehicles.add(vehicle);
    }
  }

  return graph;
}

function hasCoordinates(metadata = {}) {
  const lat = Number(metadata.latitude ?? metadata.lat);
  const lng = Number(metadata.longitude ?? metadata.lng);
  return !Number.isNaN(lat) && !Number.isNaN(lng);
}

function countStableHubs(graph) {
  let count = 0;

  for (const [, node] of graph.nodes.entries()) {
    const metadata = node?.metadata || {};
    if (metadata.dynamic) {
      continue;
    }

    if (hasCoordinates(metadata)) {
      count += 1;
    }
  }

  return count;
}

function mergeFallbackGraph(graph) {
  const fallbackGraph = graphBuilder();

  for (const [nodeId, node] of fallbackGraph.nodes.entries()) {
    if (!graph.hasNode(nodeId)) {
      graph.addNode(nodeId, node.metadata || {});
    }
  }

  for (const edge of fallbackGraph.getAllEdges()) {
    if (graph.getEdge(edge.from, edge.to, edge.mode)) {
      continue;
    }

    const mergedEdge = graph.addEdge(edge.from, edge.to, edge.mode, edge.baseWeight);
    mergedEdge.currentWeight = edge.currentWeight;
    for (const vehicle of edge.allowedVehicles || []) {
      mergedEdge.allowedVehicles.add(vehicle);
    }
  }
}

export async function graphLoader() {
  try {
    const [nodes, edges] = await Promise.all([
      graphRepository.getAllNodes(),
      graphRepository.getAllEdges()
    ]);

    if (nodes.length === 0 || edges.length === 0) {
      return graphBuilder();
    }

    const graph = hydrateGraph(nodes, edges);
    if (countStableHubs(graph) < MIN_STABLE_HUBS) {
      mergeFallbackGraph(graph);
    }

    return graph;
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.code === 'DB_SCHEMA_MISSING') {
      logger.warn('Graph tables missing, using seed graph instead', {
        message: error.message
      });
      return graphBuilder();
    }

    throw error;
  }
}
