import { ensureGraphCache } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';
import { anomalyEvent } from '../events/anomaly.event.js';
import { eventEmitter } from '../events/event-emitter.js';
import { weightManager } from '../core/graph-engine/weight-manager.js';
import { anomalyRepository } from '../repositories/anomaly.repository.js';
import { graphRepository } from '../repositories/graph.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { logger } from '../utils/logger.js';

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

    try {
      await graphRepository.updateEdgeWeight({
        from: edge.from,
        to: edge.to,
        mode: edge.mode,
        updatedWeight
      });
    } catch (error) {
      logger.warn('Failed to persist anomaly edge weight update', {
        from: edge.from,
        to: edge.to,
        mode: edge.mode,
        message: error?.message
      });
    }
  }

  if (applied.length === 0) {
    throw createHttpError(
      404,
      'ANOMALY_EDGE_NOT_FOUND',
      'No matching route edge found for anomaly simulation. Plan a route again and retry.'
    );
  }

  let anomalyId = null;
  try {
    anomalyId = await anomalyRepository.createAnomaly(payload);
    await anomalyRepository.createAnomalyEdges(anomalyId, applied, payload);
  } catch (error) {
    logger.warn('Failed to persist anomaly metadata', {
      message: error?.message,
      type: payload.type
    });
  }

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