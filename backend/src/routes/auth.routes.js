import { Router } from 'express';
import {
	currentUserController,
	forgotPasswordController,
	googleLoginController,
	guestLoginController,
	loginController,
	registerController,
	sendResetCodeController,
	verifyResetCodeController,
	resetPasswordController
} from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import { rateLimitMiddleware } from '../middlewares/rate-limit.middleware.js';
import {
	forgotPasswordValidation,
	googleLoginValidation,
	loginValidation,
	registerValidation,
	sendResetCodeValidation,
	verifyResetCodeValidation,
	resetPasswordValidation
} from '../validations/auth.validation.js';

export const authRoutes = Router();

const authAttemptLimiter = rateLimitMiddleware({
	windowMs: 15 * 60 * 1000,
	max: 10,
	message: 'Too many attempts. Please wait a few minutes and try again.'
});

authRoutes.post('/guest', authAttemptLimiter, guestLoginController);
authRoutes.post('/google', authAttemptLimiter, validationMiddleware(googleLoginValidation), googleLoginController);
authRoutes.post('/register', authAttemptLimiter, validationMiddleware(registerValidation), registerController);
authRoutes.post('/login', authAttemptLimiter, validationMiddleware(loginValidation), loginController);
authRoutes.post('/forgot-password', authAttemptLimiter, validationMiddleware(forgotPasswordValidation), forgotPasswordController);
authRoutes.post('/send-reset-code', authAttemptLimiter, validationMiddleware(sendResetCodeValidation), sendResetCodeController);
authRoutes.post('/verify-code', authAttemptLimiter, validationMiddleware(verifyResetCodeValidation), verifyResetCodeController);
authRoutes.post('/reset-password', authAttemptLimiter, validationMiddleware(resetPasswordValidation), resetPasswordController);
authRoutes.get('/me', authMiddleware, currentUserController);
