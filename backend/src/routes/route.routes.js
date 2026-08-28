import { Router } from 'express';
import { routeController, routeSimulationController } from '../controllers/route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { routeValidation } from '../validations/route.validation.js';

export const routeRoutes = Router();

routeRoutes.post('/', authMiddleware, validationMiddleware(routeValidation), routeController);
// Same request shape as POST / — real A* search over the real metro
// station graph between the nearest stations to these two points, plus
// the step-by-step trace to animate. See docs/API.md.
routeRoutes.post('/simulate', authMiddleware, validationMiddleware(routeValidation), routeSimulationController);
