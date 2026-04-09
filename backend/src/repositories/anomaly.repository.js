import { dbQuery } from '../config/db.js';

export const anomalyRepository = {
  async createAnomaly(payload) {
    const rows = await dbQuery(
      [
        'INSERT INTO anomalies (type, reason, starts_at, expires_at, status, payload)',
        'VALUES (:type, :reason, CURRENT_TIMESTAMP, :expiresAt, :status, :payload)'
      ].join(' '),
      {
        type: payload.type,
        reason: payload.reason,
        expiresAt: payload.expiresAt || null,
        status: 'active',
        payload: JSON.stringify(payload)
      }
    );

    return rows.insertId || null;
  },

  async createAnomalyEdges(anomalyId, appliedEdges, payload) {
    if (!anomalyId || appliedEdges.length === 0) {
      return;
    }

    const multiplierByKey = new Map(
      payload.affectedEdges.map((entry) => [
        `${entry.from}|${entry.to}`,
        Number(entry.multiplier)
      ])
    );

    for (const edge of appliedEdges) {
      const key = `${edge.from}|${edge.to}`;
      const multiplier = multiplierByKey.get(key) || 1;

      await dbQuery(
        [
          'INSERT INTO anomaly_edges (anomaly_id, from_node_id, to_node_id, mode, multiplier, updated_weight)',
          'VALUES (:anomalyId, :from, :to, :mode, :multiplier, :updatedWeight)'
        ].join(' '),
        {
          anomalyId,
          from: edge.from,
          to: edge.to,
          mode: edge.mode,
          multiplier,
          updatedWeight: edge.updatedWeight
        }
      );
    }
  },

  async expireAnomalies() {
    const rows = await dbQuery(
      [
        'UPDATE anomalies',
        "SET status = 'expired'",
        "WHERE status = 'active'",
        'AND expires_at IS NOT NULL',
        'AND expires_at <= CURRENT_TIMESTAMP'
      ].join(' ')
    );

    return rows.affectedRows || 0;
  }
};