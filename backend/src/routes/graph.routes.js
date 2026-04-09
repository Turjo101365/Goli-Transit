import { Router } from 'express';
import { graphController } from '../controllers/graph.controller.js';

export const graphRoutes = Router();

graphRoutes.get('/snapshot', graphController);