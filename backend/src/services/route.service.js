import { performance } from 'node:perf_hooks';
import { ensureGraphCache } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';
import { multiModalRouting } from '../core/algorithms/multi-modal-routing.js';
import { errors } from '../constants/errors.js';

export async function routeService(payload) {
  const startedAt = performance.now();
  const cachedRoute = await routeCache.get(payload);
  if (cachedRoute) {
    return {
      ...cachedRoute,
      source: 'cache',
      computeTimeMs: Number((performance.now() - startedAt).toFixed(2))
    };
  }

  const graph = await ensureGraphCache();

  if (!graph.hasNode(payload.origin) || !graph.hasNode(payload.destination)) {
    const error = new Error('Origin or destination does not exist in graph');
    error.statusCode = 404;
    error.code = errors.GRAPH_NODE_NOT_FOUND;
    throw error;
  }

  const result = multiModalRouting({
    graph,
    origin: payload.origin,
    destination: payload.destination,
    preferredModes: payload.preferredModes,
    avoidModes: payload.avoidModes,
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
    const error = new Error('No route found for provided constraints');
    error.statusCode = 404;
    error.code = errors.NOT_FOUND;
    throw error;
  }

  const response = {
    ...result,
    source: 'compute',
    computeTimeMs: Number((performance.now() - startedAt).toFixed(2))
  };

  await routeCache.set(payload, response);
  return response;
}