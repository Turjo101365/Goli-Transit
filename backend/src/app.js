import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRouter } from './routes/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { corsMiddleware } from './middlewares/cors.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  app.use(createRouter());

  // In production or unified deployment: serve frontend static files if built
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));

    app.get('*', (req, res, next) => {
      // Do not intercept API or known backend prefixes
      const apiPrefixes = [
        '/api',
        '/auth',
        '/profile',
        '/route',
        '/anomaly',
        '/graph',
        '/condition',
        '/journey',
        '/modes',
        '/health'
      ];
      if (apiPrefixes.some((prefix) => req.path.startsWith(prefix))) {
        return next();
      }

      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      },
      requestId: req.id
    });
  });

  app.use(errorMiddleware);

  return app;
}

