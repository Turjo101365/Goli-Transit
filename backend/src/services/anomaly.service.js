import { ensureGraphCache } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';
import { anomalyEvent } from '../events/anomaly.event.js';
import { eventEmitter } from '../events/event-emitter.js';
import { weightManager } from '../core/graph-engine/weight-manager.js';
import { anomalyRepository } from '../repositories/anomaly.repository.js';
import { graphRepository } from '../repositories/graph.repository.js';

export async function anomalyService(payload) {
  const graph = await ensureGraphCache();
  const applied = [];

  for (const affectedEdge of payload.affectedEdges) {
    const edge = graph.getAllEdges().find(
      (candidate) =>
        candidate.from === affectedEdge.from &&
        candidate.to === affectedEdge.to
    );

    if (!edge) {
      continue;
    }

    const updatedWeight = weightManager({
      edge,
      multiplier: affectedEdge.multiplier
    });

    applied.push({
      from: edge.from,
      to: edge.to,
      mode: edge.mode,
      updatedWeight
    });

    await graphRepository.updateEdgeWeight({
      from: edge.from,
      to: edge.to,
      mode: edge.mode,
      updatedWeight
    });
  }

  const anomalyId = await anomalyRepository.createAnomaly(payload);
  await anomalyRepository.createAnomalyEdges(anomalyId, applied, payload);

  await routeCache.invalidateAll();

  eventEmitter.emit(anomalyEvent, {
    anomaly: payload,
    applied
  });

  return {
    type: payload.type,
    reason: payload.reason,
    anomalyId,
    appliedCount: applied.length,
    applied,
    graphUpdated: applied.length > 0
  };
}