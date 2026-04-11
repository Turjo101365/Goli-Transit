import { env } from '../config/env.js';

const allowedOrigins = new Set(
  [
    env.FRONTEND_URL,
    env.APP_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ].filter(Boolean)
);

function isLocalDevOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const requestHeaders = req.headers['access-control-request-headers'];
  const allowOrigin = origin && (allowedOrigins.has(origin) || isLocalDevOrigin(origin));

  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    requestHeaders || 'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
}
