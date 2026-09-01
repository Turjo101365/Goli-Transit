import { adminRepository } from '../repositories/admin.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { graphCache } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';

export const adminService = {
  async getOverview() {
    return adminRepository.getOverviewStats();
  },

  // --- Users ---
  async listUsers(filters) {
    return adminRepository.listUsers(filters);
  },

  async listGuestUsers(filters) {
    return adminRepository.listGuestUsers(filters);
  },

  async listSavedRoutes(filters) {
    return adminRepository.listSavedRoutes(filters);
  },

  async updateUser(adminUser, targetUserId, payload, clientIp) {
    const user = await adminRepository.getUserById(targetUserId);
    if (!user) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    // Prevent non-superadmins or accidental self-demoting from locking out the system
    if (String(adminUser.id) === String(targetUserId) && payload.role && payload.role !== 'admin') {
      throw createHttpError(400, 'CANNOT_DEMOTE_SELF', 'You cannot remove your own admin privileges.');
    }

    const updated = await adminRepository.updateUser(targetUserId, payload);

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'USER_UPDATED',
      targetType: 'user',
      targetId: targetUserId,
      details: { previous: { role: user.role, status: user.status }, updated: payload },
      ipAddress: clientIp
    });

    return updated;
  },

  async deleteUser(adminUser, targetUserId, clientIp) {
    if (String(adminUser.id) === String(targetUserId)) {
      throw createHttpError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account.');
    }

    const user = await adminRepository.getUserById(targetUserId);
    if (!user) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    const deleted = await adminRepository.deleteUser(targetUserId);

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'USER_DELETED',
      targetType: 'user',
      targetId: targetUserId,
      details: { email: user.email, name: user.name },
      ipAddress: clientIp
    });

    return { success: deleted };
  },

  // --- Transit Nodes ---
  async listNodes(filters) {
    return adminRepository.listNodes(filters);
  },

  async createNode(adminUser, payload, clientIp) {
    const node = await adminRepository.createNode(payload);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'NODE_CREATED',
      targetType: 'node',
      targetId: payload.id,
      details: payload,
      ipAddress: clientIp
    });

    return node;
  },

  async updateNode(adminUser, nodeId, payload, clientIp) {
    const node = await adminRepository.updateNode(nodeId, payload);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'NODE_UPDATED',
      targetType: 'node',
      targetId: nodeId,
      details: payload,
      ipAddress: clientIp
    });

    return node;
  },

  async deleteNode(adminUser, nodeId, clientIp) {
    const deleted = await adminRepository.deleteNode(nodeId);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'NODE_DELETED',
      targetType: 'node',
      targetId: nodeId,
      details: {},
      ipAddress: clientIp
    });

    return { success: deleted };
  },

  // --- Transit Edges ---
  async listEdges(filters) {
    return adminRepository.listEdges(filters);
  },

  async createEdge(adminUser, payload, clientIp) {
    const edgeId = await adminRepository.createEdge(payload);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'EDGE_CREATED',
      targetType: 'edge',
      targetId: edgeId,
      details: payload,
      ipAddress: clientIp
    });

    return { id: edgeId, ...payload };
  },

  async updateEdge(adminUser, edgeId, payload, clientIp) {
    const edge = await adminRepository.updateEdge(edgeId, payload);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'EDGE_UPDATED',
      targetType: 'edge',
      targetId: edgeId,
      details: payload,
      ipAddress: clientIp
    });

    return edge;
  },

  async deleteEdge(adminUser, edgeId, clientIp) {
    const deleted = await adminRepository.deleteEdge(edgeId);
    await graphCache.invalidate();
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'EDGE_DELETED',
      targetType: 'edge',
      targetId: edgeId,
      details: {},
      ipAddress: clientIp
    });

    return { success: deleted };
  },

  // --- Anomalies & Disruptions ---
  async listAnomalies(filters) {
    return adminRepository.listAnomalies(filters);
  },

  async broadcastAnomaly(adminUser, payload, clientIp) {
    let expiresAt = payload.expiresAt;
    if (!expiresAt && payload.durationMinutes) {
      expiresAt = new Date(Date.now() + payload.durationMinutes * 60 * 1000).toISOString();
    }

    const anomaly = await adminRepository.createAnomaly({
      type: payload.type,
      reason: payload.reason,
      expiresAt,
      payload: {
        reason: payload.reason,
        affectedEdges: payload.affectedEdges || [],
        broadcastBy: adminUser.name || adminUser.email
      },
      affectedEdges: payload.affectedEdges || []
    });

    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'ANOMALY_BROADCASTED',
      targetType: 'anomaly',
      targetId: anomaly?.id,
      details: { type: payload.type, reason: payload.reason, expiresAt },
      ipAddress: clientIp
    });

    return anomaly;
  },

  async resolveAnomaly(adminUser, anomalyId, clientIp) {
    const anomaly = await adminRepository.resolveAnomaly(anomalyId);
    await routeCache.invalidateAll();

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'ANOMALY_RESOLVED',
      targetType: 'anomaly',
      targetId: anomalyId,
      details: {},
      ipAddress: clientIp
    });

    return anomaly;
  },

  // --- Incident Reports ---
  async listIncidents(filters) {
    return adminRepository.listIncidents(filters);
  },

  async updateIncidentStatus(adminUser, incidentId, { status }, clientIp) {
    const incident = await adminRepository.updateIncidentStatus(incidentId, {
      status,
      verifiedBy: adminUser.id
    });

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'INCIDENT_STATUS_UPDATED',
      targetType: 'incident',
      targetId: incidentId,
      details: { newStatus: status },
      ipAddress: clientIp
    });

    return incident;
  },

  // --- System Settings ---
  async getSettings() {
    return adminRepository.getSettings();
  },

  async updateSetting(adminUser, keyName, { value, description }, clientIp) {
    const settings = await adminRepository.updateSetting(keyName, value, description, adminUser.id);

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'SYSTEM_SETTING_UPDATED',
      targetType: 'setting',
      targetId: keyName,
      details: { keyName, value },
      ipAddress: clientIp
    });

    return settings;
  },

  // --- Audit Logs ---
  async listAuditLogs(pagination) {
    return adminRepository.listAuditLogs(pagination);
  }
};
