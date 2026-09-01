import { env } from '../config/env.js';

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function parseOrigins(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

const allowedOrigins = new Set(
  [
    ...parseOrigins(env.FRONTEND_URL),
    ...parseOrigins(env.APP_URL),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ].filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.has('*') || env.FRONTEND_URL === '*') {
    return true;
  }

  if (allowedOrigins.has(normalized)) {
    return true;
  }

  // Allow local dev origins
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    return true;
  }

  // Allow ANY Vercel production or preview deployment (e.g. *.vercel.app)
  if (/\.vercel\.app$/i.test(normalized) || /^https?:\/\/[a-zA-Z0-9-._]+vercel\.app/i.test(normalized)) {
    return true;
  }

  // Allow ANY Render production or preview deployment (e.g. *.onrender.com)
  if (/\.onrender\.com$/i.test(normalized) || /^https?:\/\/[a-zA-Z0-9-._]+onrender\.com/i.test(normalized)) {
    return true;
  }

  return false;
}

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const requestHeaders = req.headers['access-control-request-headers'];
  const allowOrigin = isAllowedOrigin(origin);

  if (origin && allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    requestHeaders || 'Content-Type, Authorization, X-Requested-With, Accept, Origin, x-request-id'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
}


