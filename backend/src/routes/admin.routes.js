import { Router } from 'express';
import {
  getOverviewController,
  inviteAdminController,
  listUsersController,
  listGuestUsersController,
  listSavedRoutesController,
  updateUserController,
  deleteUserController,
  listNodesController,
  createNodeController,
  updateNodeController,
  deleteNodeController,
  listEdgesController,
  createEdgeController,
  updateEdgeController,
  deleteEdgeController,
  listAnomaliesController,
  broadcastAnomalyController,
  resolveAnomalyController,
  listIncidentsController,
  updateIncidentStatusController,
  getSettingsController,
  updateSettingController,
  listAuditLogsController
} from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireStaff, requireAdmin } from '../middlewares/admin.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import {
  inviteAdminValidation,
  updateUserValidation,
  createNodeValidation,
  updateNodeValidation,
  createEdgeValidation,
  updateEdgeValidation,
  broadcastAnomalyValidation,
  updateIncidentValidation,
  updateSettingValidation
} from '../validations/admin.validation.js';

export const adminRoutes = Router();

// Protect all admin endpoints with authentication and staff (admin/moderator) role check
adminRoutes.use(authMiddleware, requireStaff);

// --- Overview ---
adminRoutes.get('/overview', getOverviewController);

// --- Users & Guests ---
adminRoutes.post('/invite', requireAdmin, validationMiddleware(inviteAdminValidation), inviteAdminController);
adminRoutes.get('/users', listUsersController);
adminRoutes.get('/guests', listGuestUsersController);
adminRoutes.get('/saved-routes', listSavedRoutesController);
adminRoutes.patch('/users/:id', validationMiddleware(updateUserValidation), updateUserController);
adminRoutes.delete('/users/:id', requireAdmin, deleteUserController);

// --- Transit Nodes ---
adminRoutes.get('/nodes', listNodesController);
adminRoutes.post('/nodes', requireAdmin, validationMiddleware(createNodeValidation), createNodeController);
adminRoutes.put('/nodes/:id', requireAdmin, validationMiddleware(updateNodeValidation), updateNodeController);
adminRoutes.delete('/nodes/:id', requireAdmin, deleteNodeController);

// --- Transit Edges ---
adminRoutes.get('/edges', listEdgesController);
adminRoutes.post('/edges', requireAdmin, validationMiddleware(createEdgeValidation), createEdgeController);
adminRoutes.put('/edges/:id', requireAdmin, validationMiddleware(updateEdgeValidation), updateEdgeController);
adminRoutes.delete('/edges/:id', requireAdmin, deleteEdgeController);

// --- Anomalies & Disruptions ---
adminRoutes.get('/anomalies', listAnomaliesController);
adminRoutes.post('/anomalies', validationMiddleware(broadcastAnomalyValidation), broadcastAnomalyController);
adminRoutes.patch('/anomalies/:id/resolve', resolveAnomalyController);

// --- Crowdsourced Incident Reports ---
adminRoutes.get('/incidents', listIncidentsController);
adminRoutes.patch('/incidents/:id', validationMiddleware(updateIncidentValidation), updateIncidentStatusController);

// --- System Settings ---
adminRoutes.get('/settings', getSettingsController);
adminRoutes.put('/settings/:key', requireAdmin, validationMiddleware(updateSettingValidation), updateSettingController);

// --- Audit Logs ---
adminRoutes.get('/audit-logs', requireAdmin, listAuditLogsController);
