import { Router } from 'express';
import { conditionController } from '../controllers/condition.controller.js';

export const conditionRoutes = Router();

conditionRoutes.get('/', conditionController);
