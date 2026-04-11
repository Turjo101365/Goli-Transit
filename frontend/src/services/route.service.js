import { apiRequest } from './api.js';

export async function createRoute(payload) {
  return apiRequest('/route', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getRecentDynamicNodes(limit = 10) {
  return apiRequest(`/graph/dynamic-nodes?limit=${encodeURIComponent(limit)}`);
}