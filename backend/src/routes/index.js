import { Router } from 'express';
import { routeRoutes } from './route.routes.js';
import { anomalyRoutes } from './anomaly.routes.js';
import { graphRoutes } from './graph.routes.js';
import { authRoutes } from './auth.routes.js';
import { apiRoutes } from './api.routes.js';
import { profileRoutes } from './profile.routes.js';
import { conditionRoutes } from './condition.routes.js';
import { journeyRoutes } from './journey.routes.js';
import { modesRoutes } from './modes.routes.js';
import { healthController } from '../controllers/graph.controller.js';

export function createRouter() {
  const router = Router();

  router.get('/health', healthController);
  router.use('/api', apiRoutes);
  router.use('/auth', authRoutes);
  router.use('/profile', profileRoutes);
  router.use('/route', routeRoutes);
  router.use('/anomaly', anomalyRoutes);
  router.use('/graph', graphRoutes);
  router.use('/condition', conditionRoutes);
  router.use('/journey', journeyRoutes);
  router.use('/modes', modesRoutes);

  return router;
}
