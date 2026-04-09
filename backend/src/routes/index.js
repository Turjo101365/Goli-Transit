import { Router } from 'express';
import { routeRoutes } from './route.routes.js';
import { anomalyRoutes } from './anomaly.routes.js';
import { graphRoutes } from './graph.routes.js';
import { healthController } from '../controllers/graph.controller.js';

export function createRouter() {
  const router = Router();

  router.get('/health', healthController);
  router.use('/route', routeRoutes);
  router.use('/anomaly', anomalyRoutes);
  router.use('/graph', graphRoutes);

  return router;
}