import { Router } from 'express';
import { modesController } from '../controllers/modes.controller.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { modesQueryValidation } from '../validations/modes.validation.js';

export const modesRoutes = Router();

modesRoutes.get('/', validationMiddleware(modesQueryValidation, 'query'), modesController);
