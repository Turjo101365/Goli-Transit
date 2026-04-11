import { dbQuery } from '../config/db.js';

export const graphRepository = {
  async getAllNodes() {
    const rows = await dbQuery('SELECT id, metadata FROM nodes ORDER BY id');
    return rows.map((row) => ({
      id: row.id,
      metadata: row.metadata || {}
    }));
  },

  async getAllEdges() {
    const rows = await dbQuery(
      [
        'SELECT from_node_id, to_node_id, mode, base_weight, current_weight, allowed_vehicles',
        'FROM edges',
        'ORDER BY from_node_id, to_node_id, mode'
      ].join(' ')
    );

    return rows.map((row) => ({
      from: row.from_node_id,
      to: row.to_node_id,
      mode: row.mode,
      baseWeight: Number(row.base_weight),
      currentWeight: Number(row.current_weight),
      allowedVehicles: Array.isArray(row.allowed_vehicles)
        ? row.allowed_vehicles
        : JSON.parse(row.allowed_vehicles || '[]')
    }));
  },

  async updateEdgeWeight({ from, to, mode, updatedWeight }) {
    await dbQuery(
      [
        'UPDATE edges',
        'SET current_weight = :updatedWeight',
        'WHERE from_node_id = :from AND to_node_id = :to AND mode = :mode'
      ].join(' '),
      { from, to, mode, updatedWeight }
    );
  },

  async upsertNode({ id, metadata = {} }) {
    await dbQuery(
      [
        'INSERT INTO nodes (id, metadata, created_at)',
        'VALUES (:id, :metadata, CURRENT_TIMESTAMP)',
        'ON DUPLICATE KEY UPDATE metadata = :metadata'
      ].join(' '),
      {
        id,
        metadata: JSON.stringify(metadata)
      }
    );
  },

  async markNodesUsed(nodeIds = [], usedAtIso = new Date().toISOString()) {
    const uniqueIds = [...new Set(nodeIds.filter(Boolean))];

    for (const nodeId of uniqueIds) {
      await dbQuery(
        [
          'UPDATE nodes',
          "SET metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), '$.lastUsedAt', :usedAt)",
          'WHERE id = :nodeId'
        ].join(' '),
        {
          nodeId,
          usedAt: usedAtIso
        }
      );
    }
  },

  async upsertEdge({ from, to, mode, baseWeight, currentWeight, allowedVehicles = [] }) {
    await dbQuery(
      [
        'INSERT INTO edges (from_node_id, to_node_id, mode, base_weight, current_weight, allowed_vehicles, created_at, updated_at)',
        'VALUES (:from, :to, :mode, :baseWeight, :currentWeight, :allowedVehicles, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        'ON DUPLICATE KEY UPDATE',
        'base_weight = :baseWeight,',
        'current_weight = :currentWeight,',
        'allowed_vehicles = :allowedVehicles,',
        'updated_at = CURRENT_TIMESTAMP'
      ].join(' '),
      {
        from,
        to,
        mode,
        baseWeight: Number(baseWeight),
        currentWeight: Number(currentWeight),
        allowedVehicles: JSON.stringify(allowedVehicles)
      }
    );
  },

  async getRecentDynamicNodes(limit = 10) {
    const rows = await dbQuery(
      [
        'SELECT id, metadata, created_at',
        'FROM nodes',
        "WHERE JSON_EXTRACT(metadata, '$.dynamic') = true",
        "ORDER BY COALESCE(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.lastUsedAt')), created_at) DESC",
        'LIMIT :limit'
      ].join(' '),
      { limit: Number(limit) }
    );

    return rows.map((row) => {
      const metadata = row.metadata && typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : (row.metadata || {});

      return {
        nodeId: row.id,
        label: metadata.displayName || metadata.label || row.id,
        coordinates: {
          lat: Number(metadata.latitude ?? metadata.lat),
          lng: Number(metadata.longitude ?? metadata.lng)
        },
        lastUsedAt: metadata.lastUsedAt || null,
        createdAt: row.created_at || null
      };
    }).filter((node) => !Number.isNaN(node.coordinates.lat) && !Number.isNaN(node.coordinates.lng));
  }
};