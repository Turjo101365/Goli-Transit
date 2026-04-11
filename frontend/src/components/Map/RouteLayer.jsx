import { Polyline } from 'react-leaflet';

export function RouteLayer({ points }) {
  if (!points || points.length < 2) {
    return null;
  }

  return <Polyline positions={points} pathOptions={{ color: '#1976d2', weight: 5 }} />;
}