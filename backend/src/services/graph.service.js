import { ensureGraphCache, graphCache, refreshGraphSnapshot } from '../cache/graph.cache.js';
import { getDbStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';

export async function getGraphSnapshot() {
  await ensureGraphCache();
  return graphCache.snapshot || (await refreshGraphSnapshot());
}

export async function getHealthSnapshot() {
  const snapshot = await getGraphSnapshot();

  return {
    ok: true,
    service: 'goli-transit-backend',
    graph: {
      nodeCount: snapshot.nodeCount,
      edgeCount: snapshot.edgeCount,
      source: graphCache.source
    },
    db: getDbStatus(),
    redis: getRedisStatus(),
    timestamp: new Date().toISOString()
  };
}