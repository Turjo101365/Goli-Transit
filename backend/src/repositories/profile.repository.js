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

export const profileRepository = {
	async getTrips(userId, limit = 10) {
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
	},

	async createTrip({ userId, fromLocation, toLocation, mode, distanceKm, durationMinutes }) {
		const result = await dbQuery(
			`INSERT INTO trips (user_id, from_location, to_location, mode, distance_km, duration_minutes)
             VALUES (:userId, :fromLocation, :toLocation, :mode, :distanceKm, :durationMinutes)`,
			{ userId, fromLocation, toLocation, mode, distanceKm, durationMinutes }
		);
		return result.insertId || null;
	},

	async getSavedRoutes(userId) {
		const rows = await dbQuery(
			`SELECT id, user_id, name, from_location, to_location, mode, duration_minutes, created_at
             FROM saved_routes 
             WHERE user_id = :userId 
             ORDER BY created_at DESC`,
			{ userId }
		);
		return rows.map(mapSavedRouteRow);
	},

	async createSavedRoute({ userId, name, fromLocation, toLocation, mode, durationMinutes }) {
		const result = await dbQuery(
			`INSERT INTO saved_routes (user_id, name, from_location, to_location, mode, duration_minutes)
             VALUES (:userId, :name, :fromLocation, :toLocation, :mode, :durationMinutes)`,
			{ userId, name, fromLocation, toLocation, mode, durationMinutes }
		);
		return result.insertId || null;
	},

	async deleteSavedRoute(userId, routeId) {
		await dbQuery(
			`DELETE FROM saved_routes WHERE id = :routeId AND user_id = :userId`,
			{ userId, routeId }
		);
	},

	async getFavoriteStops(userId) {
		const rows = await dbQuery(
			`SELECT id, user_id, name, node_id, latitude, longitude, created_at
             FROM favorite_stops 
             WHERE user_id = :userId 
             ORDER BY created_at DESC`,
			{ userId }
		);
		return rows.map(mapFavoriteStopRow);
	},

	async createFavoriteStop({ userId, name, nodeId, latitude, longitude }) {
		const result = await dbQuery(
			`INSERT INTO favorite_stops (user_id, name, node_id, latitude, longitude)
             VALUES (:userId, :name, :nodeId, :latitude, :longitude)`,
			{ userId, name, nodeId, latitude, longitude }
		);
		return result.insertId || null;
	},

	async deleteFavoriteStop(userId, stopId) {
		await dbQuery(
			`DELETE FROM favorite_stops WHERE id = :stopId AND user_id = :userId`,
			{ userId, stopId }
		);
	},

	async getStats(userId) {
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
			totalDistance: tripStats[0]?.totalDistance || 0,
			totalMinutes: tripStats[0]?.totalMinutes || 0,
			savedRoutesCount: savedRoutesCount[0]?.count || 0,
			favoriteStopsCount: favoriteStopsCount[0]?.count || 0
		};
	}
};