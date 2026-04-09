import { apiRequest } from './api.js';

export async function createAnomaly(payload) {
  return apiRequest('/anomaly', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}