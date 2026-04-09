import { CircleMarker, Popup } from 'react-leaflet';

export function Marker({ id, position, highlight = false }) {
  return (
    <CircleMarker center={position} radius={highlight ? 9 : 7} pathOptions={{ color: highlight ? '#d32f2f' : '#1976d2' }}>
      <Popup>{id}</Popup>
    </CircleMarker>
  );
}