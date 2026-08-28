import { apiRequest } from './api.js';

export async function getModeStates(condition) {
  return apiRequest(`/modes?condition=${encodeURIComponent(condition)}`, { auth: false });
}
