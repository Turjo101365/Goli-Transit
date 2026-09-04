import { apiRequest } from './api.js';

export async function getAdminOverview() {
  return apiRequest('/api/admin/overview', { method: 'GET' });
}

// --- Users, Guests & Admin Invitations ---
export async function inviteAdminUser(payload) {
  return apiRequest('/api/admin/invite', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getAdminUsers({ query = '', role = '', status = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (role) params.append('role', role);
  if (status) params.append('status', status);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/users?${params.toString()}`, { method: 'GET' });
}

export async function getAdminUserDetails(userId) {
  return apiRequest(`/api/admin/users/${userId}/details`, { method: 'GET' });
}

export async function getAdminGuests({ query = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/guests?${params.toString()}`, { method: 'GET' });
}

export async function getAdminSavedRoutes({ userId = '', search = '', mode = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (userId) params.append('userId', String(userId));
  if (search) params.append('search', search);
  if (mode) params.append('mode', mode);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/saved-routes?${params.toString()}`, { method: 'GET' });
}

export async function deleteAdminSavedRoute(routeId) {
  return apiRequest(`/api/admin/saved-routes/${routeId}`, {
    method: 'DELETE'
  });
}

export async function getAdminUserActivities({ query = '', type = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (type) params.append('type', type);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/user-activities?${params.toString()}`, { method: 'GET' });
}

export async function getAdminTrips({ search = '', mode = '', status = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (mode) params.append('mode', mode);
  if (status) params.append('status', status);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/trips?${params.toString()}`, { method: 'GET' });
}

export async function deleteAdminTrip(tripId) {
  return apiRequest(`/api/admin/trips/${tripId}`, {
    method: 'DELETE'
  });
}

export async function updateAdminUser(userId, payload) {
  return apiRequest(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminUser(userId) {
  return apiRequest(`/api/admin/users/${userId}`, {
    method: 'DELETE'
  });
}

// --- Transit Nodes ---
export async function getAdminNodes({ type = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);

  return apiRequest(`/api/admin/nodes?${params.toString()}`, { method: 'GET' });
}

export async function createAdminNode(payload) {
  return apiRequest('/api/admin/nodes', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminNode(nodeId, payload) {
  return apiRequest(`/api/admin/nodes/${nodeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminNode(nodeId) {
  return apiRequest(`/api/admin/nodes/${nodeId}`, {
    method: 'DELETE'
  });
}

// --- Transit Edges ---
export async function getAdminEdges({ mode = '', fromNode = '', toNode = '' } = {}) {
  const params = new URLSearchParams();
  if (mode) params.append('mode', mode);
  if (fromNode) params.append('fromNode', fromNode);
  if (toNode) params.append('toNode', toNode);

  return apiRequest(`/api/admin/edges?${params.toString()}`, { method: 'GET' });
}

export async function createAdminEdge(payload) {
  return apiRequest('/api/admin/edges', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdminEdge(edgeId, payload) {
  return apiRequest(`/api/admin/edges/${edgeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminEdge(edgeId) {
  return apiRequest(`/api/admin/edges/${edgeId}`, {
    method: 'DELETE'
  });
}

// --- Anomalies & Disruptions ---
export async function getAdminAnomalies({ status = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/anomalies?${params.toString()}`, { method: 'GET' });
}

export async function broadcastAdminAnomaly(payload) {
  return apiRequest('/api/admin/anomalies', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function resolveAdminAnomaly(anomalyId) {
  return apiRequest(`/api/admin/anomalies/${anomalyId}/resolve`, {
    method: 'PATCH'
  });
}

// --- Crowdsourced Incident Reports ---
export async function getAdminIncidents({ status = '', type = '', limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/incidents?${params.toString()}`, { method: 'GET' });
}

export async function updateAdminIncidentStatus(incidentId, payload) {
  return apiRequest(`/api/admin/incidents/${incidentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

// --- System Settings ---
export async function getAdminSettings() {
  return apiRequest('/api/admin/settings', { method: 'GET' });
}

export async function updateAdminSetting(key, payload) {
  return apiRequest(`/api/admin/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

// --- Audit Logs ---
export async function getAdminAuditLogs({ limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  return apiRequest(`/api/admin/audit-logs?${params.toString()}`, { method: 'GET' });
}
