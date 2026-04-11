export function distance(from, to) {
  const lat1 = Number(from?.lat ?? from?.latitude);
  const lon1 = Number(from?.lng ?? from?.longitude);
  const lat2 = Number(to?.lat ?? to?.latitude);
  const lon2 = Number(to?.lng ?? to?.longitude);

  if ([lat1, lon1, lat2, lon2].some((value) => Number.isNaN(value))) {
    return 0;
  }

  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(3));
}