import { authService } from '../services/auth.service.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { userRepository } from '../repositories/user.repository.js';

export async function getProfileController(req, res, next) {
	try {
		const userId = req.user.id;
		const user = (await userRepository.findById(userId).catch(() => null)) || req.user;

		const [trips, savedRoutes, favoriteStops, stats] = await Promise.all([
			profileRepository.getTrips(userId, 50).catch(() => []),
			profileRepository.getSavedRoutes(userId).catch(() => []),
			profileRepository.getFavoriteStops(userId).catch(() => []),
			profileRepository.getStats(userId).catch(() => ({
				totalTrips: 0,
				totalDistance: 0,
				totalMinutes: 0,
				savedRoutesCount: 0,
				favoriteStopsCount: 0
			}))
		]);

		return res.status(200).json({
			ok: true,
			data: {
				user: {
					id: String(user.id),
					name: user.name,
					email: user.email,
					role: user.role || 'user',
					status: user.status || 'active',
					phone: user.phone || null,
					avatarUrl: user.avatarUrl || user.avatar_url || null,
					bio: user.bio || null,
					hasPassword: Boolean(user.passwordHash || user.password_hash),
					lastLoginAt: user.lastLoginAt || user.last_login_at || null,
					createdAt: user.createdAt || user.created_at,
					updatedAt: user.updatedAt || user.updated_at,
					isGuest: Boolean(req.user.isGuest || (user.email && user.email.includes('guest.ezzgo.local')))
				},
				trips,
				savedRoutes,
				favoriteStops,
				stats
			},
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function updateProfileController(req, res, next) {
	try {
		const userId = req.user.id;
		const updatedUser = await authService.updateProfile(userId, req.body);

		return res.status(200).json({
			ok: true,
			data: {
				user: updatedUser
			},
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function changePasswordController(req, res, next) {
	try {
		const userId = req.user.id;
		const result = await authService.changePassword(userId, req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function deleteAccountController(req, res, next) {
	try {
		const userId = req.user.id;
		const result = await authService.deleteAccount(userId, req.body);

		return res.status(200).json({
			ok: true,
			data: result,
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function getTripsController(req, res, next) {
	try {
		const userId = req.user.id;
		const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
		const trips = await profileRepository.getTrips(userId, limit);

		return res.status(200).json({
			ok: true,
			data: { trips },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function createTripController(req, res, next) {
	try {
		const userId = req.user.id;
		const { fromLocation, toLocation, mode, distanceKm, durationMinutes, status } = req.body;

		const tripId = await profileRepository.createTrip({
			userId,
			fromLocation,
			toLocation,
			mode: mode || 'bus',
			distanceKm: distanceKm != null ? Number(distanceKm) : null,
			durationMinutes: durationMinutes != null ? Number(durationMinutes) : null,
			status: status || 'completed'
		});

		return res.status(201).json({
			ok: true,
			data: { id: tripId },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function deleteTripController(req, res, next) {
	try {
		const userId = req.user.id;
		const { tripId } = req.params;

		await profileRepository.deleteTrip(userId, parseInt(tripId));
		return res.status(200).json({
			ok: true,
			data: { success: true },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function clearTripsController(req, res, next) {
	try {
		const userId = req.user.id;
		await profileRepository.clearTrips(userId);
		return res.status(200).json({
			ok: true,
			data: { success: true },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function saveRouteController(req, res, next) {
	try {
		const userId = req.user.id;
		const { name, fromLocation, toLocation, mode, durationMinutes } = req.body;

		const routeId = await profileRepository.createSavedRoute({
			userId,
			name,
			fromLocation,
			toLocation,
			mode: mode || 'metro',
			durationMinutes: durationMinutes != null ? Number(durationMinutes) : null
		});

		return res.status(201).json({
			ok: true,
			data: { id: routeId },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function deleteSavedRouteController(req, res, next) {
	try {
		const userId = req.user.id;
		const { routeId } = req.params;

		await profileRepository.deleteSavedRoute(userId, parseInt(routeId));
		return res.status(200).json({
			ok: true,
			data: { success: true },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function addFavoriteStopController(req, res, next) {
	try {
		const userId = req.user.id;
		const { name, nodeId, latitude, longitude } = req.body;

		const stopId = await profileRepository.createFavoriteStop({
			userId,
			name,
			nodeId: nodeId || null,
			latitude: latitude != null ? Number(latitude) : null,
			longitude: longitude != null ? Number(longitude) : null
		});

		return res.status(201).json({
			ok: true,
			data: { id: stopId },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}

export async function deleteFavoriteStopController(req, res, next) {
	try {
		const userId = req.user.id;
		const { stopId } = req.params;

		await profileRepository.deleteFavoriteStop(userId, parseInt(stopId));
		return res.status(200).json({
			ok: true,
			data: { success: true },
			requestId: req.id
		});
	} catch (error) {
		return next(error);
	}
}
