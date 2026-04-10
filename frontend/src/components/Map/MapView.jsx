import { MapContainer, TileLayer } from 'react-leaflet';
import { Marker } from './Marker.jsx';
import { RouteLayer } from './RouteLayer.jsx';

export function MapView({ center, route, nodeCoordinates }) {
  const points = route
    ? route.legs
        .map((leg) => nodeCoordinates[leg.from])
        .concat(route.legs.length > 0 ? [nodeCoordinates[route.legs[route.legs.length - 1].to]] : [])
        .filter(Boolean)
    : [];

  return (
    <div className="map-card">
      <MapContainer center={center} zoom={13} scrollWheelZoom minZoom={10} maxZoom={18} maxBounds={[[23.65,90.30],[23.90,90.50]]} maxBoundsViscosity={1.0} className="map-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {Object.entries(nodeCoordinates).map(([id, position]) => (
          <Marker key={id} id={id} position={position} highlight={points.some((point) => point === position)} />
        ))}

        <RouteLayer points={points} />
      </MapContainer>
    </div>
  );
}