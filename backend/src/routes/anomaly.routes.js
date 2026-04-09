import { Router } from 'express';
import { anomalyController } from '../controllers/anomaly.controller.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { anomalyValidation } from '../validations/anomaly.validation.js';

export const anomalyRoutes = Router();

anomalyRoutes.post('/', validationMiddleware(anomalyValidation), anomalyController);