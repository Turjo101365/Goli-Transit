import { apiRequest } from './api.js';

export async function createRoute(payload) {
  return apiRequest('/route', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function simulateRoute(payload) {
  return apiRequest('/route/simulate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getRecentDynamicNodes(limit = 10) {
  return apiRequest(`/graph/dynamic-nodes?limit=${encodeURIComponent(limit)}`);
}

export async function getGraphSnapshot() {
  return apiRequest('/graph/snapshot');
}