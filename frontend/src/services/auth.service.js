import { apiRequest } from './api.js';
import {
  clearStoredSession,
  getStoredSession,
  getStoredUser,
  hasStoredSession,
  saveStoredSession
} from './auth.storage.js';

export function getCurrentUser() {
  return getStoredUser();
}

export function hasActiveSession() {
  return hasStoredSession();
}

export async function registerUser(payload) {
  const session = await apiRequest('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });

  saveStoredSession(session);
  return session.user;
}

export async function loginUser(payload) {
  const session = await apiRequest('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });

  saveStoredSession(session);
  return session.user;
}

// Emergency access — no email/password. Short-lived session (6h), never a
// real account; see backend/src/services/auth.service.js's guest().
export async function loginAsGuest() {
  const session = await apiRequest('/auth/guest', {
    method: 'POST',
    auth: false
  });

  saveStoredSession(session);
  return session.user;
}

// `credential` is the signed ID token Google's Identity Services button
// hands back client-side — the backend verifies it against GOOGLE_CLIENT_ID
// before trusting anything in it, same as any other login.
export async function loginWithGoogle(credential) {
  const session = await apiRequest('/auth/google', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ credential })
  });

  saveStoredSession(session);
  return session.user;
}

export async function requestPasswordReset(payload) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export async function sendResetCode(payload) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export async function verifyResetCode(payload) {
  return apiRequest('/auth/verify-code', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export async function resetUserPassword(payload) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export async function updatePassword(payload) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(payload)
  });
}

export async function restoreSession() {
  const session = getStoredSession();

  if (!session?.token) {
    return null;
  }

  try {
    const user = await apiRequest('/auth/me');
    saveStoredSession({
      token: session.token,
      user
    });
    return user;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function logoutUser() {
  clearStoredSession();
}
