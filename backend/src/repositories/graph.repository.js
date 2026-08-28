import { dbQuery } from '../config/db.js';

export const graphRepository = {
  async getAllNodes() {
    const rows = await dbQuery('SELECT id, name_bn, name_en, lat, lng, type FROM nodes ORDER BY id');
    return rows.map((row) => ({
      id: row.id,
      metadata: {
        nameBn: row.name_bn,
        nameEn: row.name_en,
        lat: Number(row.lat),
        lng: Number(row.lng),
        type: row.type
      }
    }));
  },

  async getAllEdges() {
    const rows = await dbQuery(
      [
        'SELECT from_node, to_node, mode, base_minutes, fare_taka',
        'FROM edges',
        'ORDER BY from_node, to_node, mode'
      ].join(' ')
    );

    return rows.map((row) => ({
      from: row.from_node,
      to: row.to_node,
      mode: row.mode,
      baseWeight: Number(row.base_minutes),
      currentWeight: Number(row.base_minutes),
      fareTaka: Number(row.fare_taka),
      allowedVehicles: [row.mode]
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

  async getRecentDynamicNodes() {
    // The new nodes schema (name_bn/name_en/lat/lng/type) has no concept of a
    // dynamically-geocoded node; that metadata-JSON mechanism belonged to the
    // old placeholder graph. Callers already fall back to the in-memory graph
    // cache when this returns empty.
    return [];
  },

};