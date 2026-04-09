import { apiRequest } from './api.js';

export async function createRoute(payload) {
  return apiRequest('/route', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}