export const AUTH_UNAUTHORIZED_EVENT = 'goli-transit:auth-unauthorized';

const SESSION_STORAGE_KEY = 'goli-transit-auth-session';

function readStorage(fallbackValue = null) {
  if (typeof window === 'undefined') {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeStorage(value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(value));
}

export function getStoredSession() {
  return readStorage(null);
}

export function getStoredAuthToken() {
  return getStoredSession()?.token || null;
}

export function getStoredUser() {
  return getStoredSession()?.user || null;
}

export function hasStoredSession() {
  return Boolean(getStoredAuthToken());
}

export function saveStoredSession(session) {
  writeStorage(session);
  return session;
}

export function clearStoredSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}
