import { Router } from 'express';
import {
	currentUserController,
	forgotPasswordController,
	loginController,
	registerController,
	resetPasswordController
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import {
	forgotPasswordValidation,
	loginValidation,
	registerValidation,
	resetPasswordValidation
} from '../validations/auth.validation.js';

export const authRoutes = Router();

authRoutes.post('/register', validationMiddleware(registerValidation), registerController);
authRoutes.post('/login', validationMiddleware(loginValidation), loginController);
authRoutes.post('/forgot-password', validationMiddleware(forgotPasswordValidation), forgotPasswordController);
authRoutes.post('/reset-password', validationMiddleware(resetPasswordValidation), resetPasswordController);
authRoutes.get('/me', authMiddleware, currentUserController);
