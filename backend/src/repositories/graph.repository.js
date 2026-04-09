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
  }
};