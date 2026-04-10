import { Router } from 'express';
import { routeController } from '../controllers/route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { routeValidation } from '../validations/route.validation.js';

export const routeRoutes = Router();

routeRoutes.post('/', authMiddleware, validationMiddleware(routeValidation), routeController);
