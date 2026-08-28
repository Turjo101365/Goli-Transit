import { apiRequest } from './api.js';

export async function getCondition() {
  return apiRequest('/condition', { auth: false });
}
