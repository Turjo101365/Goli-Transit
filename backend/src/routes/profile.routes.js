import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
	getProfileController,
	updateProfileController,
	createTripController,
	saveRouteController,
	deleteSavedRouteController,
	addFavoriteStopController,
	deleteFavoriteStopController
} from '../controllers/profile.controller.js';

export const profileRoutes = Router();

profileRoutes.get('/', authMiddleware, getProfileController);
profileRoutes.put('/', authMiddleware, updateProfileController);
profileRoutes.post('/trips', authMiddleware, createTripController);
profileRoutes.post('/routes', authMiddleware, saveRouteController);
profileRoutes.delete('/routes/:routeId', authMiddleware, deleteSavedRouteController);
profileRoutes.post('/stops', authMiddleware, addFavoriteStopController);
profileRoutes.delete('/stops/:stopId', authMiddleware, deleteFavoriteStopController);