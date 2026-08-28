// Ray-casting test. `polygon` is a ring of [lng, lat] pairs (GeoJSON order).
export function pointInPolygon(lat, lng, polygon) {
	if (!Array.isArray(polygon) || polygon.length < 3) {
		return false;
	}

	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [lngI, latI] = polygon[i];
		const [lngJ, latJ] = polygon[j];

		const intersects =
			latI > lat !== latJ > lat &&
			lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;

		if (intersects) {
			inside = !inside;
		}
	}

	return inside;
}
