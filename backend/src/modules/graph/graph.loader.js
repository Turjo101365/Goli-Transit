import { Graph } from '../../core/graph-engine/graph.js';
import { graphRepository } from '../../repositories/graph.repository.js';
import { graphBuilder } from '../../core/graph-engine/graph-builder.js';
import { logger } from '../../utils/logger.js';

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
    for (const vehicle of edgeRecord.allowedVehicles || []) {
      edge.allowedVehicles.add(vehicle);
    }
  }

  return graph;
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

    return hydrateGraph(nodes, edges);
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
