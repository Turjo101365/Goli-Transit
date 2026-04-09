import { Polyline } from 'react-leaflet';

export function RouteLayer({ points }) {
  if (!points || points.length < 2) {
    return null;
  }

  return <Polyline positions={points} pathOptions={{ color: '#ff7043', weight: 5 }} />;
}