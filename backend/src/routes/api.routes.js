import { Router } from 'express';
import { apiRegisterController, apiUsersController } from '../controllers/api.controller.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { registerValidation } from '../validations/auth.validation.js';

export const apiRoutes = Router();

apiRoutes.post('/register', validationMiddleware(registerValidation), apiRegisterController);
apiRoutes.get('/users', apiUsersController);
