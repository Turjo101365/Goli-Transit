import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validationMiddleware } from '../middlewares/validation.middleware.js';
import {
	updateProfileValidation,
	changePasswordValidation,
	deleteAccountValidation,
	createTripValidation,
	saveRouteValidation,
	favoriteStopValidation
} from '../validations/profile.validation.js';
import {
	getProfileController,
	updateProfileController,
	changePasswordController,
	deleteAccountController,
	getTripsController,
	createTripController,
	deleteTripController,
	clearTripsController,
	saveRouteController,
	deleteSavedRouteController,
	addFavoriteStopController,
	deleteFavoriteStopController
} from '../controllers/profile.controller.js';

export const profileRoutes = Router();

profileRoutes.get('/', authMiddleware, getProfileController);
profileRoutes.put('/', authMiddleware, validationMiddleware(updateProfileValidation), updateProfileController);
profileRoutes.put('/password', authMiddleware, validationMiddleware(changePasswordValidation), changePasswordController);
profileRoutes.post('/change-password', authMiddleware, validationMiddleware(changePasswordValidation), changePasswordController);
profileRoutes.delete('/account', authMiddleware, validationMiddleware(deleteAccountValidation), deleteAccountController);
profileRoutes.delete('/', authMiddleware, validationMiddleware(deleteAccountValidation), deleteAccountController);

profileRoutes.get('/trips', authMiddleware, getTripsController);
profileRoutes.post('/trips', authMiddleware, validationMiddleware(createTripValidation), createTripController);
profileRoutes.delete('/trips/:tripId', authMiddleware, deleteTripController);
profileRoutes.delete('/trips', authMiddleware, clearTripsController);

profileRoutes.post('/routes', authMiddleware, validationMiddleware(saveRouteValidation), saveRouteController);
profileRoutes.delete('/routes/:routeId', authMiddleware, deleteSavedRouteController);

profileRoutes.post('/stops', authMiddleware, validationMiddleware(favoriteStopValidation), addFavoriteStopController);
profileRoutes.delete('/stops/:stopId', authMiddleware, deleteFavoriteStopController);