import { apiRequest } from './api.js';

export async function evaluateJourney(payload) {
  return apiRequest('/journey/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
