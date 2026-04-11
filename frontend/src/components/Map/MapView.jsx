import { CircleMarker, MapContainer, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import { Marker } from './Marker.jsx';
import { RouteLayer } from './RouteLayer.jsx';

function formatCoordinate(latlng) {
  return `${latlng.lat.toFixed(6)},${latlng.lng.toFixed(6)}`;
}

function MapClickPicker({ enabled, target, onPick, marker }) {
  useMapEvents({
    click(event) {
      if (!enabled || typeof onPick !== 'function') {
        return;
      }

      onPick({
        target,
        lat: event.latlng.lat,
        lng: event.latlng.lng,
        value: formatCoordinate(event.latlng)
      });
    }
  });

  if (!marker) {
    return null;
  }

  return (
    <CircleMarker center={[marker.lat, marker.lng]} radius={8} pathOptions={{ color: marker.color || '#ff9800' }}>
      <Popup>{marker.label || formatCoordinate(marker)}</Popup>
    </CircleMarker>
  );
}

function toLeafletPoint(value) {
  if (!value) {
    return null;
  }

  if (Array.isArray(value) && value.length >= 2) {
    return value;
  }

  if (typeof value.lat === 'number' && typeof value.lng === 'number') {
    return [value.lat, value.lng];
  }

  if (typeof value.latitude === 'number' && typeof value.longitude === 'number') {
    return [value.latitude, value.longitude];
  }

  return null;
}

export function MapView({ center, route, nodeCoordinates, mapPicker }) {
  const points = route?.pathCoordinates?.length
    ? route.pathCoordinates
        .map((entry) => toLeafletPoint(entry.coordinates))
        .filter(Boolean)
    : route
      ? route.legs
          .map((leg) => toLeafletPoint(nodeCoordinates[leg.from]))
          .concat(route.legs.length > 0 ? [toLeafletPoint(nodeCoordinates[route.legs[route.legs.length - 1].to])] : [])
          .filter(Boolean)
      : [];

  const highlightedNodes = new Set(route?.pathNodes || []);

  return (
    <div className="map-card">
      <MapContainer center={center} zoom={13} scrollWheelZoom minZoom={10} maxZoom={18} maxBounds={[[23.65,90.30],[23.90,90.50]]} maxBoundsViscosity={1.0} className="map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickPicker
          enabled={Boolean(mapPicker?.enabled)}
          target={mapPicker?.target || 'source'}
          onPick={mapPicker?.onPick}
          marker={mapPicker?.marker}
        />

        {Object.entries(nodeCoordinates).map(([id, position]) => (
          <Marker key={id} id={id} position={position} highlight={highlightedNodes.has(id)} />
        ))}

        <RouteLayer points={points} />
      </MapContainer>
    </div>
  );
}