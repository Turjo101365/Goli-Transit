import { Router } from 'express';
import { journeyEvaluateController } from '../controllers/journey.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { journeyEvaluateValidation } from '../validations/journey.validation.js';

export const journeyRoutes = Router();

journeyRoutes.post('/evaluate', authMiddleware, validationMiddleware(journeyEvaluateValidation), journeyEvaluateController);
