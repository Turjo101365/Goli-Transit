import { dbQuery } from '../config/db.js';

function mapTripRow(row) {
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		fromLocation: row.from_location,
		toLocation: row.to_location,
		mode: row.mode,
		distanceKm: row.distance_km,
		durationMinutes: row.duration_minutes,
		status: row.status,
		completedAt: row.completed_at,
		createdAt: row.created_at
	};
}

function mapSavedRouteRow(row) {
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		fromLocation: row.from_location,
		toLocation: row.to_location,
		mode: row.mode,
		durationMinutes: row.duration_minutes,
		createdAt: row.created_at
	};
}

function mapFavoriteStopRow(row) {
	if (!row) return null;
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		nodeId: row.node_id,
		latitude: row.latitude,
		longitude: row.longitude,
		createdAt: row.created_at
	};
}

const memoryTrips = [];
const memorySavedRoutes = [];
const memoryFavoriteStops = [];
let sequenceId = 1;

export const profileRepository = {
	async getTrips(userId, limit = 10) {
		try {
			const rows = await dbQuery(
				`SELECT id, user_id, from_location, to_location, mode, distance_km, 
	             duration_minutes, status, completed_at, created_at
	             FROM trips 
	             WHERE user_id = :userId 
	             ORDER BY completed_at DESC 
	             LIMIT :limit`,
				{ userId, limit }
			);
			return rows.map(mapTripRow);
		} catch {
			return memoryTrips
				.filter((t) => String(t.userId) === String(userId))
				.slice(0, limit);
		}
	},

	async createTrip({ userId, fromLocation, toLocation, mode, distanceKm, durationMinutes, status = 'completed' }) {
		try {
			const result = await dbQuery(
				`INSERT INTO trips (user_id, from_location, to_location, mode, distance_km, duration_minutes, status)
	             VALUES (:userId, :fromLocation, :toLocation, :mode, :distanceKm, :durationMinutes, :status)`,
				{ userId, fromLocation, toLocation, mode, distanceKm, durationMinutes, status }
			);
			return result.insertId || null;
		} catch {
			const id = sequenceId++;
			const item = {
				id,
				userId,
				fromLocation,
				toLocation,
				mode: mode || 'bus',
				distanceKm: distanceKm ? Number(distanceKm) : 0,
				durationMinutes: durationMinutes ? Number(durationMinutes) : 0,
				status,
				completedAt: new Date().toISOString(),
				createdAt: new Date().toISOString()
			};
			memoryTrips.unshift(item);
			return id;
		}
	},

	async getSavedRoutes(userId) {
		try {
			const rows = await dbQuery(
				`SELECT id, user_id, name, from_location, to_location, mode, duration_minutes, created_at
	             FROM saved_routes 
	             WHERE user_id = :userId 
	             ORDER BY created_at DESC`,
				{ userId }
			);
			return rows.map(mapSavedRouteRow);
		} catch {
			return memorySavedRoutes.filter((r) => String(r.userId) === String(userId));
		}
	},

	async createSavedRoute({ userId, name, fromLocation, toLocation, mode, durationMinutes }) {
		try {
			const result = await dbQuery(
				`INSERT INTO saved_routes (user_id, name, from_location, to_location, mode, duration_minutes)
	             VALUES (:userId, :name, :fromLocation, :toLocation, :mode, :durationMinutes)`,
				{ userId, name, fromLocation, toLocation, mode, durationMinutes }
			);
			return result.insertId || null;
		} catch {
			const id = sequenceId++;
			const item = {
				id,
				userId,
				name,
				fromLocation,
				toLocation,
				mode: mode || 'metro',
				durationMinutes: durationMinutes ? Number(durationMinutes) : null,
				createdAt: new Date().toISOString()
			};
			memorySavedRoutes.unshift(item);
			return id;
		}
	},

	async deleteSavedRoute(userId, routeId) {
		try {
			await dbQuery(
				`DELETE FROM saved_routes WHERE id = :routeId AND user_id = :userId`,
				{ userId, routeId }
			);
		} catch {
			const idx = memorySavedRoutes.findIndex((r) => String(r.id) === String(routeId) && String(r.userId) === String(userId));
			if (idx !== -1) memorySavedRoutes.splice(idx, 1);
		}
	},

	async getFavoriteStops(userId) {
		try {
			const rows = await dbQuery(
				`SELECT id, user_id, name, node_id, latitude, longitude, created_at
	             FROM favorite_stops 
	             WHERE user_id = :userId 
	             ORDER BY created_at DESC`,
				{ userId }
			);
			return rows.map(mapFavoriteStopRow);
		} catch {
			return memoryFavoriteStops.filter((s) => String(s.userId) === String(userId));
		}
	},

	async createFavoriteStop({ userId, name, nodeId, latitude, longitude }) {
		try {
			const result = await dbQuery(
				`INSERT INTO favorite_stops (user_id, name, node_id, latitude, longitude)
	             VALUES (:userId, :name, :nodeId, :latitude, :longitude)`,
				{ userId, name, nodeId, latitude, longitude }
			);
			return result.insertId || null;
		} catch {
			const id = sequenceId++;
			const item = {
				id,
				userId,
				name,
				nodeId,
				latitude,
				longitude,
				createdAt: new Date().toISOString()
			};
			memoryFavoriteStops.unshift(item);
			return id;
		}
	},

	async deleteFavoriteStop(userId, stopId) {
		try {
			await dbQuery(
				`DELETE FROM favorite_stops WHERE id = :stopId AND user_id = :userId`,
				{ userId, stopId }
			);
		} catch {
			const idx = memoryFavoriteStops.findIndex((s) => String(s.id) === String(stopId) && String(s.userId) === String(userId));
			if (idx !== -1) memoryFavoriteStops.splice(idx, 1);
		}
	},

	async getStats(userId) {
		try {
			const tripStats = await dbQuery(
				`SELECT 
					COUNT(*) as totalTrips,
					COALESCE(SUM(distance_km), 0) as totalDistance,
					COALESCE(SUM(duration_minutes), 0) as totalMinutes
	             FROM trips 
	             WHERE user_id = :userId AND status = 'completed'`,
				{ userId }
			);

			const savedRoutesCount = await dbQuery(
				`SELECT COUNT(*) as count FROM saved_routes WHERE user_id = :userId`,
				{ userId }
			);

			const favoriteStopsCount = await dbQuery(
				`SELECT COUNT(*) as count FROM favorite_stops WHERE user_id = :userId`,
				{ userId }
			);

			return {
				totalTrips: tripStats[0]?.totalTrips || 0,
				totalDistance: Number(tripStats[0]?.totalDistance || 0),
				totalMinutes: Number(tripStats[0]?.totalMinutes || 0),
				savedRoutesCount: savedRoutesCount[0]?.count || 0,
				favoriteStopsCount: favoriteStopsCount[0]?.count || 0
			};
		} catch {
			const userTrips = memoryTrips.filter((t) => String(t.userId) === String(userId) && t.status === 'completed');
			const userSaved = memorySavedRoutes.filter((r) => String(r.userId) === String(userId));
			const userStops = memoryFavoriteStops.filter((s) => String(s.userId) === String(userId));
			const totalDistance = userTrips.reduce((acc, t) => acc + Number(t.distanceKm || 0), 0);
			const totalMinutes = userTrips.reduce((acc, t) => acc + Number(t.durationMinutes || 0), 0);

			return {
				totalTrips: userTrips.length,
				totalDistance,
				totalMinutes,
				savedRoutesCount: userSaved.length,
				favoriteStopsCount: userStops.length
			};
		}
	}
};