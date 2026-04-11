import { performance } from 'node:perf_hooks';
import { ensureGraphCache, refreshGraphSnapshot } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';
import { multiModalRouting } from '../core/algorithms/multi-modal-routing.js';
import { placeService } from './place.service.js';
import { errors } from '../constants/errors.js';
import { graphRepository } from '../repositories/graph.repository.js';
import { logger } from '../utils/logger.js';

function markInMemoryNodeUsage(graph, nodeIds, usedAtIso) {
  for (const nodeId of nodeIds) {
    const node = graph.nodes.get(nodeId);
    if (!node) {
      continue;
    }

    node.metadata = {
      ...(node.metadata || {}),
      lastUsedAt: usedAtIso
    };
  }
}

export async function routeService(payload) {
  const startedAt = performance.now();
  const graph = await ensureGraphCache();

  const originResolution = await placeService.resolvePlaceToNode({ graph, placeInput: payload.origin });
  const destinationResolution = await placeService.resolvePlaceToNode({ graph, placeInput: payload.destination });

  const resolvedPayload = {
    ...payload,
    origin: originResolution.nodeId,
    destination: destinationResolution.nodeId
  };

  const usageStamp = new Date().toISOString();
  try {
    await graphRepository.markNodesUsed(
      [resolvedPayload.origin, resolvedPayload.destination],
      usageStamp
    );
  } catch (error) {
    logger.warn('Failed to persist node usage metadata', {
      message: error?.message,
      origin: resolvedPayload.origin,
      destination: resolvedPayload.destination
    });
  }
  markInMemoryNodeUsage(
    graph,
    [resolvedPayload.origin, resolvedPayload.destination],
    usageStamp
  );

  if (originResolution.created || destinationResolution.created) {
    await routeCache.invalidateAll();
    await refreshGraphSnapshot();
  }

  const cachedRoute = await routeCache.get(resolvedPayload);
  if (cachedRoute) {
    return {
      ...cachedRoute,
      requestedOrigin: payload.origin,
      requestedDestination: payload.destination,
      resolvedOrigin: resolvedPayload.origin,
      resolvedDestination: resolvedPayload.destination,
      source: 'cache',
      computeTimeMs: Number((performance.now() - startedAt).toFixed(2))
    };
  }

  if (!graph.hasNode(resolvedPayload.origin) || !graph.hasNode(resolvedPayload.destination)) {
    const error = new Error('Origin or destination does not exist in graph');
    error.statusCode = 404;
    error.code = errors.GRAPH_NODE_NOT_FOUND;
    throw error;
  }

  const result = multiModalRouting({
    graph,
    origin: resolvedPayload.origin,
    destination: resolvedPayload.destination,
    preferredModes: payload.preferredModes,
    avoidModes: payload.avoidModes,
    requireStableHopWhenDynamicEndpoints: true,
    vehicleType: payload.vehicleType,
    timeoutMs: 2500
  });

  if (result?.timedOut) {
    const error = new Error('Route computation timed out');
    error.statusCode = 504;
    error.code = 'ROUTE_TIMEOUT';
    throw error;
  }

  if (!result) {
    const error = new Error('No route found between these places with current graph coverage and selected transport constraints');
    error.statusCode = 404;
    error.code = errors.NOT_FOUND;
    throw error;
  }

  const response = {
    ...result,
    requestedOrigin: payload.origin,
    requestedDestination: payload.destination,
    resolvedOrigin: resolvedPayload.origin,
    resolvedDestination: resolvedPayload.destination,
    source: 'compute',
    computeTimeMs: Number((performance.now() - startedAt).toFixed(2))
  };

  await routeCache.set(resolvedPayload, response);
  return response;
}