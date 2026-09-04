import { adminRepository } from '../repositories/admin.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { graphCache } from '../cache/graph.cache.js';
import { routeCache } from '../cache/route.cache.js';
import { hashPassword } from '../utils/password.js';
import { sendAdminInviteEmail } from './mail.service.js';

export const adminService = {
  async getOverview() {
    return adminRepository.getOverviewStats();
  },

  // --- Users & Invitations ---
  async inviteAdmin(adminUser, { email, name, role = 'admin', tempPassword }, clientIp) {
    const existing = await adminRepository.getUserByEmail(email);
    let targetUser = null;
    let isExistingUser = false;
    const generatedPassword = tempPassword || `Admin@${Math.floor(100000 + Math.random() * 900000)}`;

    if (existing) {
      isExistingUser = true;
      targetUser = await adminRepository.updateUser(existing.id, {
        role,
        status: 'active',
        name: name || existing.name
      });

      await adminRepository.createAuditLog({
        adminId: adminUser.id,
        action: 'ADMIN_INVITED_EXISTING',
        targetType: 'user',
        targetId: existing.id,
        details: { email, previousRole: existing.role, newRole: role },
        ipAddress: clientIp
      });
    } else {
      const passwordHash = hashPassword(generatedPassword);
      targetUser = await adminRepository.createAdminUser({
        name: name || email.split('@')[0],
        email,
        role,
        passwordHash,
        status: 'active'
      });

      await adminRepository.createAuditLog({
        adminId: adminUser.id,
        action: 'ADMIN_INVITED_NEW',
        targetType: 'user',
        targetId: targetUser.id,
        details: { email, role },
        ipAddress: clientIp
      });
    }

    // Send invitation email
    const mailResult = await sendAdminInviteEmail({
      to: email,
      name: targetUser.name,
      role,
      tempPassword: isExistingUser ? null : generatedPassword,
      inviterName: adminUser.name || 'Super Admin'
    });

    return {
      success: true,
      user: targetUser,
      isExistingUser,
      tempPassword: isExistingUser ? null : generatedPassword,
      emailDelivered: Boolean(mailResult?.delivered),
      mockedDelivery: Boolean(mailResult?.mocked)
    };
  },
  async listUsers(filters) {
    return adminRepository.listUsers(filters);
  },

  async getUserDetails(userId) {
    const details = await adminRepository.getUserDetails(userId);
    if (!details) {
      throw createHttpError(404, 'USER_NOT_FOUND', 'User not found.');
    }
    return details;
  },

  async listGuestUsers(filters) {
    return adminRepository.listGuestUsers(filters);
  },

  async listSavedRoutes(filters) {
    return adminRepository.listSavedRoutes(filters);
  },

  async deleteSavedRoute(adminUser, routeId, clientIp) {
    const deleted = await adminRepository.deleteSavedRoute(routeId);
    if (!deleted) {
      throw createHttpError(404, 'ROUTE_NOT_FOUND', 'Saved route not found.');
    }

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'SAVED_ROUTE_DELETED',
      targetType: 'saved_route',
      targetId: routeId,
      details: {},
      ipAddress: clientIp
    });

    return { success: true };
  },

  async listAllUserActivities(filters) {
    return adminRepository.listAllUserActivities(filters);
  },

  async listTrips(filters) {
    return adminRepository.listTrips(filters);
  },

  async deleteTrip(adminUser, tripId, clientIp) {
    const deleted = await adminRepository.deleteTrip(tripId);
    if (!deleted) {
      throw createHttpError(404, 'TRIP_NOT_FOUND', 'Trip not found.');
    }

    await adminRepository.createAuditLog({
      adminId: adminUser.id,
      action: 'TRIP_DELETED',
      targetType: 'trip',
      targetId: tripId,
      details: {},
      ipAddress: clientIp
    });

    return { success: true };
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
