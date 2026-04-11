import { dbQuery } from '../config/db.js';
import { profileRepository } from '../repositories/profile.repository.js';
import { userRepository } from '../repositories/user.repository.js';

export async function getProfileController(req, res, next) {
	try {
		const userId = req.user.id;
		
		const user = await userRepository.findById(userId);
		if (!user) {
			return res.status(200).json({
				ok: true,
				data: {
					user: {
						id: req.user.id,
						name: req.user.name,
						email: req.user.email,
						createdAt: req.user.createdAt || null,
						updatedAt: req.user.updatedAt || null
					},
					trips: [],
					savedRoutes: [],
					favoriteStops: [],
					stats: {
						totalTrips: 0,
						totalDistance: 0,
						totalMinutes: 0,
						savedRoutesCount: 0,
						favoriteStopsCount: 0
					}
				},
				requestId: req.id
			});
		}

		const [trips, savedRoutes, favoriteStops, stats] = await Promise.all([
			profileRepository.getTrips(userId, 10).catch(() => []),
			profileRepository.getSavedRoutes(userId).catch(() => []),
			profileRepository.getFavoriteStops(userId).catch(() => []),
			profileRepository.getStats(userId).catch(() => ({ totalTrips: 0, totalDistance: 0, totalMinutes: 0, savedRoutesCount: 0, favoriteStopsCount: 0 }))
		]);

		return res.status(200).json({
			ok: true,
			data: {
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt
				},
				trips,
				savedRoutes,
				favoriteStops,
				stats
			},
			requestId: req.id
		});
	} catch (error) {
		next(error);
	}
}

export async function updateProfileController(req, res, next) {
	try {
		const userId = req.user.id;
		const { name, email } = req.body;

		if (!name || !email) {
			return res.status(400).json({
				ok: false,
				error: {
					code: 'PROFILE_INVALID_INPUT',
					message: 'Name and email are required'
				},
				requestId: req.id
			});
		}

		await dbQuery(
			`UPDATE users SET name = :name, email = :email, updated_at = CURRENT_TIMESTAMP WHERE id = :userId`,
			{ name, email, userId }
		);

		const user = await userRepository.findById(userId);
		return res.status(200).json({
			ok: true,
			data: {
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					createdAt: user.createdAt,
					updatedAt: user.updatedAt
				}
			},
			requestId: req.id
		});
	} catch (error) {
		next(error);
	}
}

export async function saveRouteController(req, res, next) {
	try {
		const userId = req.user.id;
		const { name, fromLocation, toLocation, mode, durationMinutes } = req.body;

		if (!name || !fromLocation || !toLocation) {
			return res.status(400).json({
				ok: false,
				error: {
					code: 'PROFILE_INVALID_INPUT',
					message: 'Name, from location, and to location are required'
				},
				requestId: req.id
			});
		}

		const routeId = await profileRepository.createSavedRoute({
			userId,
			name,
			fromLocation,
			toLocation,
			mode,
			durationMinutes
		});

		return res.status(201).json({
			ok: true,
			data: { id: routeId },
			requestId: req.id
		});
	} catch (error) {
		next(error);
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
		next(error);
	}
}

export async function addFavoriteStopController(req, res, next) {
	try {
		const userId = req.user.id;
		const { name, nodeId, latitude, longitude } = req.body;

		if (!name) {
			return res.status(400).json({
				ok: false,
				error: {
					code: 'PROFILE_INVALID_INPUT',
					message: 'Name is required'
				},
				requestId: req.id
			});
		}

		const stopId = await profileRepository.createFavoriteStop({
			userId,
			name,
			nodeId,
			latitude,
			longitude
		});

		return res.status(201).json({
			ok: true,
			data: { id: stopId },
			requestId: req.id
		});
	} catch (error) {
		next(error);
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
		next(error);
	}
}
