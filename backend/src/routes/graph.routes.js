import { Router } from 'express';
import { graphController, recentDynamicNodesController } from '../controllers/graph.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const graphRoutes = Router();

graphRoutes.get('/snapshot', authMiddleware, graphController);
graphRoutes.get('/dynamic-nodes', authMiddleware, recentDynamicNodesController);
