import express from 'express';
import { createRouter } from './routes/index.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(requestIdMiddleware);
  app.use(loggerMiddleware);
  app.use(createRouter());

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