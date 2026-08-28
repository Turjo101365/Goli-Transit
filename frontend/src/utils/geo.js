// Same haversine formula as backend/src/utils/distance.js — a fixed
// geometry formula, not a fact that can drift, so duplicating it here
// (rather than a round-trip to the backend) is fine.
export function distanceKm(from, to) {
	const lat1 = Number(from?.lat);
	const lng1 = Number(from?.lng);
	const lat2 = Number(to?.lat);
	const lng2 = Number(to?.lng);

	if ([lat1, lng1, lat2, lng2].some((value) => Number.isNaN(value))) {
		return 0;
	}

	const toRadians = (degrees) => (degrees * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const deltaLat = toRadians(lat2 - lat1);
	const deltaLng = toRadians(lng2 - lng1);

	const a =
		Math.sin(deltaLat / 2) ** 2 +
		Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return earthRadiusKm * c;
}

export function nearestStation(point, stations) {
	let nearest = null;
	let nearestKm = Infinity;

	for (const station of stations) {
		const km = distanceKm(point, station);
		if (km < nearestKm) {
			nearestKm = km;
			nearest = station;
		}
	}

	return nearest ? { station: nearest, km: nearestKm } : null;
}
