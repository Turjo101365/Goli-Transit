import { Router } from 'express';
import { apiRegisterController } from '../controllers/api.controller.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { registerValidation } from '../validations/auth.validation.js';

export const apiRoutes = Router();

apiRoutes.post('/register', validationMiddleware(registerValidation), apiRegisterController);
