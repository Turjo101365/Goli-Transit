import { ensureGraphCache, graphCache, refreshGraphSnapshot } from '../cache/graph.cache.js';
import { getDbStatus } from '../config/db.js';
import { getRedisStatus } from '../config/redis.js';
import { graphRepository } from '../repositories/graph.repository.js';

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

export async function getRecentDynamicNodes(limit = 10) {
  await ensureGraphCache();

  const dbNodes = await graphRepository.getRecentDynamicNodes(limit);
  if (dbNodes.length > 0) {
    return dbNodes;
  }

  const fallback = [];
  for (const [nodeId, node] of graphCache.graph.nodes.entries()) {
    const metadata = node.metadata || {};
    if (!metadata.dynamic) {
      continue;
    }

    const lat = Number(metadata.latitude ?? metadata.lat);
    const lng = Number(metadata.longitude ?? metadata.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    fallback.push({
      nodeId,
      label: metadata.displayName || metadata.label || nodeId,
      coordinates: { lat, lng },
      lastUsedAt: metadata.lastUsedAt || null,
      createdAt: metadata.createdAt || null
    });
  }

  return fallback
    .sort((a, b) => {
      const left = new Date(a.lastUsedAt || a.createdAt || 0).getTime();
      const right = new Date(b.lastUsedAt || b.createdAt || 0).getTime();
      return right - left;
    })
    .slice(0, Number(limit));
}