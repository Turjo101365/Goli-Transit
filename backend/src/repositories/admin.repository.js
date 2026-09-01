import { dbQuery } from '../config/db.js';

function formatMySqlDateTime(val) {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

export const adminRepository = {
  // --- 1. OVERVIEW & ANALYTICS ---
  async getOverviewStats() {
    try {
      const [
        userCountRows,
        nodeCountRows,
        edgeCountRows,
        anomalyCountRows,
        incidentCountRows,
        tripCountRows,
        modeTripRows,
        modeEdgeRows,
        recentLogsRows,
        recentAnomaliesRows,
        savedRouteCountRows,
        guestCountRows
      ] = await Promise.all([
        dbQuery(`
          SELECT 
            COUNT(*) as totalUsers,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as adminCount,
            SUM(CASE WHEN role = 'moderator' THEN 1 ELSE 0 END) as moderatorCount,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeUsers,
            SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspendedUsers
          FROM users
        `),
        dbQuery(`
          SELECT 
            COUNT(*) as totalNodes,
            SUM(CASE WHEN type = 'metro_station' THEN 1 ELSE 0 END) as metroStations,
            SUM(CASE WHEN type = 'bus_stop' THEN 1 ELSE 0 END) as busStops,
            SUM(CASE WHEN type = 'landmark' THEN 1 ELSE 0 END) as landmarks
          FROM nodes
        `),
        dbQuery(`SELECT COUNT(*) as totalEdges FROM edges`),
        dbQuery(`
          SELECT 
            COUNT(*) as totalAnomalies,
            SUM(CASE WHEN status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP) THEN 1 ELSE 0 END) as activeAnomalies
          FROM anomalies
        `),
        dbQuery(`
          SELECT 
            COUNT(*) as totalIncidents,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingIncidents,
            SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifiedIncidents
          FROM incident_reports
        `),
        dbQuery(`
          SELECT 
            COUNT(*) as totalTrips,
            COALESCE(SUM(distance_km), 0) as totalDistanceKm,
            COALESCE(AVG(duration_minutes), 0) as avgDurationMinutes
          FROM trips
        `),
        dbQuery(`
          SELECT mode, COUNT(*) as tripCount
          FROM trips
          WHERE mode IS NOT NULL
          GROUP BY mode
        `),
        dbQuery(`
          SELECT mode, COUNT(*) as edgeCount
          FROM edges
          GROUP BY mode
        `),
        dbQuery(`
          SELECT a.id, a.admin_id, a.action, a.target_type, a.target_id, a.details, a.created_at, u.name as admin_name
          FROM admin_audit_logs a
          LEFT JOIN users u ON u.id = a.admin_id
          ORDER BY a.id DESC
          LIMIT 8
        `),
        dbQuery(`
          SELECT id, type, reason, status, starts_at, expires_at, created_at
          FROM anomalies
          ORDER BY id DESC
          LIMIT 6
        `),
        dbQuery(`SELECT COUNT(*) as totalSavedRoutes FROM saved_routes`),
        dbQuery(`SELECT COUNT(*) as totalGuests FROM users WHERE email LIKE '%guest%' OR name LIKE '%Guest%'`)
      ]);

      const userStats = userCountRows[0] || {};
      const nodeStats = nodeCountRows[0] || {};
      const edgeStats = edgeCountRows[0] || {};
      const anomalyStats = anomalyCountRows[0] || {};
      const incidentStats = incidentCountRows[0] || {};
      const tripStats = tripCountRows[0] || {};
      const savedRouteStats = savedRouteCountRows[0] || {};
      const guestStats = guestCountRows[0] || {};

      return {
        users: {
          total: Number(userStats.totalUsers || 0),
          active: Number(userStats.activeUsers || 0),
          admins: Number(userStats.adminCount || 0),
          moderators: Number(userStats.moderatorCount || 0),
          suspended: Number(userStats.suspendedUsers || 0),
          guests: Number(guestStats.totalGuests || 0)
        },
        savedRoutes: {
          total: Number(savedRouteStats.totalSavedRoutes || 0)
        },
        nodes: {
          total: Number(nodeStats.totalNodes || 0),
          metroStations: Number(nodeStats.metroStations || 0),
          busStops: Number(nodeStats.busStops || 0),
          landmarks: Number(nodeStats.landmarks || 0)
        },
        edges: {
          total: Number(edgeStats.totalEdges || 0),
          modeBreakdown: modeEdgeRows || []
        },
        anomalies: {
          total: Number(anomalyStats.totalAnomalies || 0),
          active: Number(anomalyStats.activeAnomalies || 0),
          recent: recentAnomaliesRows || []
        },
        incidents: {
          total: Number(incidentStats.totalIncidents || 0),
          pending: Number(incidentStats.pendingIncidents || 0),
          verified: Number(incidentStats.verifiedIncidents || 0)
        },
        trips: {
          total: Number(tripStats.totalTrips || 0),
          totalDistanceKm: Number(tripStats.totalDistanceKm || 0).toFixed(1),
          avgDurationMinutes: Math.round(Number(tripStats.avgDurationMinutes || 0)),
          modeDistribution: modeTripRows || []
        },
        recentAuditLogs: recentLogsRows || []
      };
    } catch (error) {
      console.error('Error fetching admin overview stats:', error.message);
      return {
        users: { total: 0, active: 0, admins: 0, moderators: 0, suspended: 0 },
        nodes: { total: 0, metroStations: 0, busStops: 0, landmarks: 0 },
        edges: { total: 0, modeBreakdown: [] },
        anomalies: { total: 0, active: 0, recent: [] },
        incidents: { total: 0, pending: 0, verified: 0 },
        trips: { total: 0, totalDistanceKm: 0, avgDurationMinutes: 0, modeDistribution: [] },
        recentAuditLogs: []
      };
    }
  },

  // --- 2. USER MANAGEMENT ---
  async listUsers({ query = '', role = '', status = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.last_login_at, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) as trip_count,
        (SELECT COUNT(*) FROM saved_routes sr WHERE sr.user_id = u.id) as saved_routes_count
      FROM users u
      WHERE 1=1
    `;
    const params = {};

    if (query) {
      sql += ` AND (u.name LIKE :query OR u.email LIKE :query OR u.phone LIKE :query)`;
      params.query = `%${query}%`;
    }
    if (role) {
      sql += ` AND u.role = :role`;
      params.role = role;
    }
    if (status) {
      sql += ` AND u.status = :status`;
      params.status = status;
    }

    sql += ` ORDER BY u.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const countSql = `
      SELECT COUNT(*) as total FROM users u WHERE 1=1
      ${query ? 'AND (u.name LIKE :query OR u.email LIKE :query OR u.phone LIKE :query)' : ''}
      ${role ? 'AND u.role = :role' : ''}
      ${status ? 'AND u.status = :status' : ''}
    `;

    const [rows, countRows] = await Promise.all([
      dbQuery(sql, params),
      dbQuery(countSql, params)
    ]);

    return {
      users: rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role || 'user',
        status: r.status || 'active',
        phone: r.phone || null,
        lastLoginAt: r.last_login_at,
        createdAt: r.created_at,
        tripCount: Number(r.trip_count || 0),
        savedRoutesCount: Number(r.saved_routes_count || 0)
      })),
      total: Number(countRows[0]?.total || 0),
      limit: Number(limit),
      offset: Number(offset)
    };
  },

  async getUserById(id) {
    const rows = await dbQuery(
      `SELECT id, name, email, role, status, phone, last_login_at, created_at, updated_at FROM users WHERE id = :id LIMIT 1`,
      { id }
    );
    if (!rows[0]) return null;
    const u = rows[0];
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role || 'user',
      status: u.status || 'active',
      phone: u.phone || null,
      lastLoginAt: u.last_login_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at
    };
  },

  async updateUser(id, { name, email, role, status, phone }) {
    const fields = [];
    const params = { id };

    if (name !== undefined) { fields.push('name = :name'); params.name = name; }
    if (email !== undefined) { fields.push('email = :email'); params.email = email; }
    if (role !== undefined) { fields.push('role = :role'); params.role = role; }
    if (status !== undefined) { fields.push('status = :status'); params.status = status; }
    if (phone !== undefined) { fields.push('phone = :phone'); params.phone = phone; }

    if (fields.length === 0) return this.getUserById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    await dbQuery(`UPDATE users SET ${fields.join(', ')} WHERE id = :id`, params);
    return this.getUserById(id);
  },

  async deleteUser(id) {
    const result = await dbQuery(`DELETE FROM users WHERE id = :id`, { id });
    return result.affectedRows > 0;
  },

  async listGuestUsers({ query = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.status, u.phone, u.last_login_at, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) as trip_count,
        (SELECT COUNT(*) FROM saved_routes sr WHERE sr.user_id = u.id) as saved_routes_count
      FROM users u
      WHERE (u.email LIKE '%guest.ezzgo.local%' OR u.name LIKE '%Guest%' OR u.email LIKE 'guest_%')
    `;
    const params = {};

    if (query) {
      sql += ` AND (u.name LIKE :query OR u.email LIKE :query)`;
      params.query = `%${query}%`;
    }

    sql += ` ORDER BY u.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const countSql = `
      SELECT COUNT(*) as total FROM users u
      WHERE (u.email LIKE '%guest.ezzgo.local%' OR u.name LIKE '%Guest%' OR u.email LIKE 'guest_%')
      ${query ? 'AND (u.name LIKE :query OR u.email LIKE :query)' : ''}
    `;

    const [rows, countRows] = await Promise.all([
      dbQuery(sql, params),
      dbQuery(countSql, params)
    ]);

    return {
      guests: rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role || 'user',
        status: r.status || 'active',
        lastLoginAt: r.last_login_at,
        createdAt: r.created_at,
        tripCount: Number(r.trip_count || 0),
        savedRoutesCount: Number(r.saved_routes_count || 0)
      })),
      total: Number(countRows[0]?.total || 0),
      limit: Number(limit),
      offset: Number(offset)
    };
  },

  async listSavedRoutes({ search = '', mode = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT sr.id, sr.user_id, sr.name, sr.from_location, sr.to_location, sr.mode, sr.duration_minutes, sr.created_at,
             u.name as user_name, u.email as user_email, u.role as user_role
      FROM saved_routes sr
      LEFT JOIN users u ON u.id = sr.user_id
      WHERE 1=1
    `;
    const params = {};

    if (search) {
      sql += ` AND (sr.name LIKE :search OR sr.from_location LIKE :search OR sr.to_location LIKE :search OR u.name LIKE :search OR u.email LIKE :search)`;
      params.search = `%${search}%`;
    }
    if (mode) {
      sql += ` AND sr.mode = :mode`;
      params.mode = mode;
    }

    sql += ` ORDER BY sr.id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const countSql = `
      SELECT COUNT(*) as total
      FROM saved_routes sr
      LEFT JOIN users u ON u.id = sr.user_id
      WHERE 1=1
      ${search ? 'AND (sr.name LIKE :search OR sr.from_location LIKE :search OR sr.to_location LIKE :search OR u.name LIKE :search OR u.email LIKE :search)' : ''}
      ${mode ? 'AND sr.mode = :mode' : ''}
    `;

    const [rows, countRows] = await Promise.all([
      dbQuery(sql, params),
      dbQuery(countSql, params)
    ]);

    return {
      routes: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name || 'Anonymous User',
        userEmail: r.user_email || 'N/A',
        userRole: r.user_role || 'user',
        name: r.name,
        fromLocation: r.from_location,
        toLocation: r.to_location,
        mode: r.mode || 'transit',
        durationMinutes: r.duration_minutes,
        createdAt: r.created_at
      })),
      total: Number(countRows[0]?.total || 0),
      limit: Number(limit),
      offset: Number(offset)
    };
  },

  // --- 3. TRANSIT NODES & EDGES ---
  async listNodes({ type = '', search = '' } = {}) {
    let sql = `SELECT id, name_bn, name_en, lat, lng, type, created_at FROM nodes WHERE 1=1`;
    const params = {};
    if (type) {
      sql += ` AND type = :type`;
      params.type = type;
    }
    if (search) {
      sql += ` AND (name_bn LIKE :search OR name_en LIKE :search OR id LIKE :search)`;
      params.search = `%${search}%`;
    }
    sql += ` ORDER BY name_en ASC`;

    const rows = await dbQuery(sql, params);
    return rows.map(r => ({
      id: r.id,
      nameBn: r.name_bn,
      nameEn: r.name_en,
      lat: Number(r.lat),
      lng: Number(r.lng),
      type: r.type,
      createdAt: r.created_at
    }));
  },

  async createNode({ id, nameBn, nameEn, lat, lng, type }) {
    await dbQuery(
      `INSERT INTO nodes (id, name_bn, name_en, lat, lng, type)
       VALUES (:id, :nameBn, :nameEn, :lat, :lng, :type)`,
      { id, nameBn, nameEn, lat, lng, type: type || 'metro_station' }
    );
    const rows = await dbQuery(`SELECT * FROM nodes WHERE id = :id LIMIT 1`, { id });
    return rows[0] || null;
  },

  async updateNode(id, { nameBn, nameEn, lat, lng, type }) {
    const fields = [];
    const params = { id };
    if (nameBn !== undefined) { fields.push('name_bn = :nameBn'); params.nameBn = nameBn; }
    if (nameEn !== undefined) { fields.push('name_en = :nameEn'); params.nameEn = nameEn; }
    if (lat !== undefined) { fields.push('lat = :lat'); params.lat = lat; }
    if (lng !== undefined) { fields.push('lng = :lng'); params.lng = lng; }
    if (type !== undefined) { fields.push('type = :type'); params.type = type; }

    if (fields.length > 0) {
      await dbQuery(`UPDATE nodes SET ${fields.join(', ')} WHERE id = :id`, params);
    }
    const rows = await dbQuery(`SELECT * FROM nodes WHERE id = :id LIMIT 1`, { id });
    return rows[0] || null;
  },

  async deleteNode(id) {
    const result = await dbQuery(`DELETE FROM nodes WHERE id = :id`, { id });
    return result.affectedRows > 0;
  },

  async listEdges({ mode = '', fromNode = '', toNode = '' } = {}) {
    let sql = `
      SELECT e.id, e.from_node, e.to_node, e.mode, e.base_minutes, e.fare_taka, e.created_at, e.updated_at,
             fn.name_bn as from_name_bn, fn.name_en as from_name_en,
             tn.name_bn as to_name_bn, tn.name_en as to_name_en
      FROM edges e
      LEFT JOIN nodes fn ON fn.id = e.from_node
      LEFT JOIN nodes tn ON tn.id = e.to_node
      WHERE 1=1
    `;
    const params = {};
    if (mode) {
      sql += ` AND e.mode = :mode`;
      params.mode = mode;
    }
    if (fromNode) {
      sql += ` AND e.from_node = :fromNode`;
      params.fromNode = fromNode;
    }
    if (toNode) {
      sql += ` AND e.to_node = :toNode`;
      params.toNode = toNode;
    }
    sql += ` ORDER BY e.id ASC`;

    const rows = await dbQuery(sql, params);
    return rows.map(r => ({
      id: r.id,
      fromNode: r.from_node,
      fromNodeNameBn: r.from_name_bn || r.from_node,
      fromNodeNameEn: r.from_name_en || r.from_node,
      toNode: r.to_node,
      toNodeNameBn: r.to_name_bn || r.to_node,
      toNodeNameEn: r.to_name_en || r.to_node,
      mode: r.mode,
      baseMinutes: r.base_minutes,
      fareTaka: r.fare_taka,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async createEdge({ fromNode, toNode, mode, baseMinutes, fareTaka }) {
    const result = await dbQuery(
      `INSERT INTO edges (from_node, to_node, mode, base_minutes, fare_taka)
       VALUES (:fromNode, :toNode, :mode, :baseMinutes, :fareTaka)
       ON DUPLICATE KEY UPDATE base_minutes = :baseMinutes, fare_taka = :fareTaka, updated_at = CURRENT_TIMESTAMP`,
      { fromNode, toNode, mode, baseMinutes, fareTaka }
    );
    return result.insertId || null;
  },

  async updateEdge(id, { baseMinutes, fareTaka, mode }) {
    const fields = [];
    const params = { id };
    if (baseMinutes !== undefined) { fields.push('base_minutes = :baseMinutes'); params.baseMinutes = baseMinutes; }
    if (fareTaka !== undefined) { fields.push('fare_taka = :fareTaka'); params.fareTaka = fareTaka; }
    if (mode !== undefined) { fields.push('mode = :mode'); params.mode = mode; }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      await dbQuery(`UPDATE edges SET ${fields.join(', ')} WHERE id = :id`, params);
    }
    const rows = await dbQuery(`SELECT * FROM edges WHERE id = :id LIMIT 1`, { id });
    return rows[0] || null;
  },

  async deleteEdge(id) {
    const result = await dbQuery(`DELETE FROM edges WHERE id = :id`, { id });
    return result.affectedRows > 0;
  },

  // --- 4. ANOMALIES & DISRUPTIONS ---
  async listAnomalies({ status = '', limit = 50, offset = 0 } = {}) {
    let sql = `SELECT id, type, reason, starts_at, expires_at, status, payload, created_at FROM anomalies WHERE 1=1`;
    const params = {};
    if (status) {
      sql += ` AND status = :status`;
      params.status = status;
    }
    sql += ` ORDER BY id DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const rows = await dbQuery(sql, params);
    return rows.map(r => ({
      id: r.id,
      type: r.type,
      reason: r.reason,
      startsAt: r.starts_at,
      expiresAt: r.expires_at,
      status: r.status,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload || '{}') : r.payload,
      createdAt: r.created_at
    }));
  },

  async createAnomaly({ type, reason, expiresAt, payload, affectedEdges = [] }) {
    const result = await dbQuery(
      `INSERT INTO anomalies (type, reason, starts_at, expires_at, status, payload)
       VALUES (:type, :reason, CURRENT_TIMESTAMP, :expiresAt, 'active', :payload)`,
      {
        type,
        reason,
        expiresAt: formatMySqlDateTime(expiresAt),
        payload: JSON.stringify(payload || { reason, affectedEdges })
      }
    );

    const anomalyId = result.insertId;

    if (anomalyId && Array.isArray(affectedEdges) && affectedEdges.length > 0) {
      for (const edge of affectedEdges) {
        try {
          await dbQuery(
            `INSERT INTO anomaly_edges (anomaly_id, from_node, to_node, mode, multiplier, updated_weight)
             VALUES (:anomalyId, :from, :to, :mode, :multiplier, :updatedWeight)`,
            {
              anomalyId,
              from: edge.from,
              to: edge.to,
              mode: edge.mode || 'bus',
              multiplier: edge.multiplier || 1.5,
              updatedWeight: edge.updatedWeight || (edge.baseMinutes ? edge.baseMinutes * (edge.multiplier || 1.5) : 10)
            }
          );
        } catch (_err) {
          // ignore duplicate / non-existing edge errors gracefully
        }
      }
    }

    const rows = await dbQuery(`SELECT * FROM anomalies WHERE id = :id LIMIT 1`, { id: anomalyId });
    return rows[0] || null;
  },

  async resolveAnomaly(id) {
    await dbQuery(`UPDATE anomalies SET status = 'resolved' WHERE id = :id`, { id });
    const rows = await dbQuery(`SELECT * FROM anomalies WHERE id = :id LIMIT 1`, { id });
    return rows[0] || null;
  },

  // --- 5. INCIDENT REPORTS ---
  async listIncidents({ status = '', type = '', limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT ir.id, ir.user_id, ir.reporter_name, ir.title, ir.description, ir.type, ir.location_name,
             ir.lat, ir.lng, ir.corridor_id, ir.severity, ir.status, ir.upvotes, ir.verified_by,
             ir.created_at, ir.updated_at,
             u.name as verifier_name
      FROM incident_reports ir
      LEFT JOIN users u ON u.id = ir.verified_by
      WHERE 1=1
    `;
    const params = {};
    if (status) {
      sql += ` AND ir.status = :status`;
      params.status = status;
    }
    if (type) {
      sql += ` AND ir.type = :type`;
      params.type = type;
    }
    sql += ` ORDER BY ir.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    const rows = await dbQuery(sql, params);
    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      reporterName: r.reporter_name || 'Commuter',
      title: r.title,
      description: r.description,
      type: r.type,
      locationName: r.location_name,
      lat: r.lat ? Number(r.lat) : null,
      lng: r.lng ? Number(r.lng) : null,
      corridorId: r.corridor_id,
      severity: r.severity,
      status: r.status,
      upvotes: Number(r.upvotes || 0),
      verifiedBy: r.verified_by,
      verifierName: r.verifier_name,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  async updateIncidentStatus(id, { status, verifiedBy }) {
    await dbQuery(
      `UPDATE incident_reports SET status = :status, verified_by = :verifiedBy, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
      { id, status, verifiedBy: verifiedBy || null }
    );
    const rows = await dbQuery(`SELECT * FROM incident_reports WHERE id = :id LIMIT 1`, { id });
    return rows[0] || null;
  },

  // --- 6. SYSTEM SETTINGS ---
  async getSettings() {
    const rows = await dbQuery(`SELECT key_name, value_json, description, updated_at FROM system_settings`);
    const settings = {};
    for (const row of rows) {
      settings[row.key_name] = {
        value: typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json,
        description: row.description,
        updatedAt: row.updated_at
      };
    }
    return settings;
  },

  async updateSetting(keyName, valueJson, description, updatedBy) {
    await dbQuery(
      `INSERT INTO system_settings (key_name, value_json, description, updated_by, updated_at)
       VALUES (:keyName, :valueJson, :description, :updatedBy, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE value_json = :valueJson, description = COALESCE(:description, description), updated_by = :updatedBy, updated_at = CURRENT_TIMESTAMP`,
      {
        keyName,
        valueJson: JSON.stringify(valueJson),
        description: description || null,
        updatedBy: updatedBy || null
      }
    );
    return this.getSettings();
  },

  // --- 7. AUDIT LOGS ---
  async createAuditLog({ adminId, action, targetType, targetId, details = null, ipAddress = null }) {
    try {
      await dbQuery(
        `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
         VALUES (:adminId, :action, :targetType, :targetId, :details, :ipAddress)`,
        {
          adminId,
          action,
          targetType,
          targetId: String(targetId || ''),
          details: details ? JSON.stringify(details) : null,
          ipAddress: ipAddress || null
        }
      );
    } catch (err) {
      console.warn('Failed to record admin audit log:', err.message);
    }
  },

  async listAuditLogs({ limit = 50, offset = 0 } = {}) {
    const rows = await dbQuery(
      `SELECT a.id, a.admin_id, a.action, a.target_type, a.target_id, a.details, a.ip_address, a.created_at,
              u.name as admin_name, u.email as admin_email, u.role as admin_role
       FROM admin_audit_logs a
       LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.id DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`
    );

    return rows.map(r => ({
      id: r.id,
      adminId: r.admin_id,
      adminName: r.admin_name || 'System Admin',
      adminEmail: r.admin_email || '',
      adminRole: r.admin_role || 'admin',
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: typeof r.details === 'string' ? JSON.parse(r.details || '{}') : r.details,
      ipAddress: r.ip_address,
      createdAt: r.created_at
    }));
  }
};
