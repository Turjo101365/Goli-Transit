import { adminService } from '../services/admin.service.js';

export async function getOverviewController(req, res, next) {
  try {
    const data = await adminService.getOverview();
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- User Controllers ---
export async function inviteAdminController(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.inviteAdmin(req.user, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function listUsersController(req, res, next) {
  try {
    const { query, role, status, limit, offset } = req.query;
    const data = await adminService.listUsers({ query, role, status, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function getUserDetailsController(req, res, next) {
  try {
    const { id } = req.params;
    const data = await adminService.getUserDetails(id);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function listGuestUsersController(req, res, next) {
  try {
    const { query, limit, offset } = req.query;
    const data = await adminService.listGuestUsers({ query, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function listSavedRoutesController(req, res, next) {
  try {
    const { userId, search, mode, limit, offset } = req.query;
    const data = await adminService.listSavedRoutes({ userId, search, mode, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function deleteSavedRouteController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.deleteSavedRoute(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function listAllUserActivitiesController(req, res, next) {
  try {
    const { query, type, limit, offset } = req.query;
    const data = await adminService.listAllUserActivities({ query, type, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function listTripsController(req, res, next) {
  try {
    const { search, mode, status, limit, offset } = req.query;
    const data = await adminService.listTrips({ search, mode, status, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function deleteTripController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.deleteTrip(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function updateUserController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateUser(req.user, id, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function deleteUserController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.deleteUser(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- Node Controllers ---
export async function listNodesController(req, res, next) {
  try {
    const { type, search } = req.query;
    const data = await adminService.listNodes({ type, search });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function createNodeController(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.createNode(req.user, req.body, clientIp);
    return res.status(201).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function updateNodeController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateNode(req.user, id, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function deleteNodeController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.deleteNode(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- Edge Controllers ---
export async function listEdgesController(req, res, next) {
  try {
    const { mode, fromNode, toNode } = req.query;
    const data = await adminService.listEdges({ mode, fromNode, toNode });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function createEdgeController(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.createEdge(req.user, req.body, clientIp);
    return res.status(201).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function updateEdgeController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateEdge(req.user, id, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function deleteEdgeController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.deleteEdge(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- Anomaly Controllers ---
export async function listAnomaliesController(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const data = await adminService.listAnomalies({ status, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function broadcastAnomalyController(req, res, next) {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.broadcastAnomaly(req.user, req.body, clientIp);
    return res.status(201).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function resolveAnomalyController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.resolveAnomaly(req.user, id, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- Incident Report Controllers ---
export async function listIncidentsController(req, res, next) {
  try {
    const { status, type, limit, offset } = req.query;
    const data = await adminService.listIncidents({ status, type, limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function updateIncidentStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateIncidentStatus(req.user, id, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- System Settings Controllers ---
export async function getSettingsController(req, res, next) {
  try {
    const data = await adminService.getSettings();
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

export async function updateSettingController(req, res, next) {
  try {
    const { key } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || null;
    const data = await adminService.updateSetting(req.user, key, req.body, clientIp);
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}

// --- Audit Logs Controllers ---
export async function listAuditLogsController(req, res, next) {
  try {
    const { limit, offset } = req.query;
    const data = await adminService.listAuditLogs({ limit, offset });
    return res.status(200).json({ ok: true, data, requestId: req.id });
  } catch (error) {
    next(error);
  }
}
