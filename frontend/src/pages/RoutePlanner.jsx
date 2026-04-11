import { useEffect, useMemo, useState } from 'react';
import { MapView } from '../components/Map/MapView.jsx';
import { ModeSelector } from '../components/Routing/ModeSelector.jsx';
import { RouteDisplay } from '../components/Routing/RouteDisplay.jsx';
import { createRoute, getRecentDynamicNodes } from '../services/route.service.js';
import { createAnomaly } from '../services/anomaly.service.js';
import { Loader } from '../components/UI/Loader.jsx';

const modeOptions = ['walk', 'bike', 'bus', 'metro'];

function toRouteErrorMessage(apiError) {
  const code = apiError?.code || null;
  const status = apiError?.status || null;

  if (code === 'PLACE_NOT_FOUND') {
    return 'Place not found. Try a more specific Dhaka area name or exact coordinates (lat,lng).';
  }

  if (code === 'GEOCODER_UNAVAILABLE' || status === 503) {
    return 'Map place lookup is temporarily unavailable. Please try again in a moment.';
  }

  if (code === 'GRAPH_CONNECTIVITY_GAP') {
    return 'This place is not connected to the stable transit network yet. Try a nearby major area.';
  }

  if (status === 404 || code === 'NOT_FOUND') {
    return 'No route found for this pair with current graph coverage and selected transport modes. Try changing modes or nearby hubs.';
  }

  if (code === 'ANOMALY_EDGE_NOT_FOUND') {
    return 'Could not apply congestion to this path. Please plan the route again and retry anomaly simulation.';
  }

  return apiError?.message || 'Unable to fetch route.';
}

function coordinatesFromEntry(entry) {
  const coordinates = entry?.coordinates;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return [coordinates[0], coordinates[1]];
  }

  if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
    return [coordinates.lat, coordinates.lng];
  }

  if (coordinates && typeof coordinates.latitude === 'number' && typeof coordinates.longitude === 'number') {
    return [coordinates.latitude, coordinates.longitude];
  }

  return null;
}

function buildNodeCoordinates(route) {
  if (!route || !Array.isArray(route.pathNodes) || !Array.isArray(route.pathCoordinates)) {
    return {};
  }

  const byNode = {};
  route.pathNodes.forEach((nodeId, index) => {
    const point = coordinatesFromEntry(route.pathCoordinates[index]);
    if (point) {
      byNode[nodeId] = point;
    }
  });

  return byNode;
}

export function RoutePlanner({ authUser, activeSection, setActiveSection, scrollToSection, navigateTo, page }) {
  const [sourceInput, setSourceInput] = useState('A');
  const [destinationInput, setDestinationInput] = useState('C');
  const [selectedModes, setSelectedModes] = useState(['walk', 'bike', 'bus', 'metro']);
  const [routeResult, setRouteResult] = useState(null);
  const [reroutedResult, setReroutedResult] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isApplyingAnomaly, setIsApplyingAnomaly] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [mapPickTarget, setMapPickTarget] = useState(null);
  const [pickedLocation, setPickedLocation] = useState(null);

  const visualRoute = reroutedResult || routeResult;
  const mapCenter = [23.8103, 90.4125];
  const nodeCoordinates = useMemo(() => buildNodeCoordinates(visualRoute), [visualRoute]);

  async function loadDynamicSuggestions() {
    try {
      const nodes = await getRecentDynamicNodes(20);
      setSuggestions(Array.isArray(nodes) ? nodes : []);
    } catch {
      setSuggestions([]);
    }
  }

  useEffect(() => {
    void loadDynamicSuggestions();
  }, []);

  async function handlePlanRoute(event) {
    event.preventDefault();
    setError('');
    setReroutedResult(null);

    if (!sourceInput.trim() || !destinationInput.trim()) {
      setError('Enter source and destination place names.');
      return;
    }

    setIsLoadingRoute(true);

    try {
      const result = await createRoute({
        origin: sourceInput.trim(),
        destination: destinationInput.trim(),
        preferredModes: selectedModes,
        avoidModes: [],
        vehicleType: null
      });

      setRouteResult(result);
      void loadDynamicSuggestions();
    } catch (apiError) {
      setError(toRouteErrorMessage(apiError));
      setRouteResult(null);
    } finally {
      setIsLoadingRoute(false);
    }
  }

  function handleMapPick({ target, lat, lng, value }) {
    if (target === 'destination') {
      setDestinationInput(value);
      setPickedLocation({ lat, lng, label: 'Destination from map', color: '#d32f2f' });
    } else {
      setSourceInput(value);
      setPickedLocation({ lat, lng, label: 'Source from map', color: '#2e7d32' });
    }

    setMapPickTarget(null);
  }

  async function handleSimulateAnomaly() {
    if (!routeResult || routeResult.legs.length === 0) {
      setError('Plan a route first before applying an anomaly.');
      return;
    }

    setError('');
    setIsApplyingAnomaly(true);

    try {
      const congestedLeg = routeResult.legs[routeResult.legs.length - 1];

      await createAnomaly({
        type: 'EDGE_WEIGHT_MULTIPLIER',
        reason: 'Hackathon congestion simulation',
        affectedEdges: [
          {
            from: congestedLeg.from,
            to: congestedLeg.to,
            multiplier: 3
          }
        ]
      });

      const nextRoute = await createRoute({
        origin: sourceInput.trim(),
        destination: destinationInput.trim(),
        preferredModes: selectedModes,
        avoidModes: [],
        vehicleType: null
      });

      setReroutedResult(nextRoute);
      void loadDynamicSuggestions();
    } catch (apiError) {
      setError(toRouteErrorMessage(apiError));
    } finally {
      setIsApplyingAnomaly(false);
    }
  }

  return (
    <section className="planner-layout fade-in">
      <form className="planner-panel" onSubmit={handlePlanRoute}>
        <h2>Route Planner</h2>
        <p>Type any Dhaka place name or coordinates (lat,lng), choose transport modes, and simulate traffic anomalies.</p>

        <label>
          Source place
          <input
            list="dynamic-place-suggestions"
            value={sourceInput}
            onChange={(event) => setSourceInput(event.target.value)}
            placeholder="e.g. Gulshan, Dhanmondi or 23.8103,90.4125"
          />
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setMapPickTarget((current) => (current === 'source' ? null : 'source'))}
          >
            {mapPickTarget === 'source' ? 'Cancel Map Pick' : 'Pick Source From Map'}
          </button>
        </label>

        <label>
          Destination place
          <input
            list="dynamic-place-suggestions"
            value={destinationInput}
            onChange={(event) => setDestinationInput(event.target.value)}
            placeholder="e.g. Mirpur, Motijheel or 23.7500,90.3900"
          />
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setMapPickTarget((current) => (current === 'destination' ? null : 'destination'))}
          >
            {mapPickTarget === 'destination' ? 'Cancel Map Pick' : 'Pick Destination From Map'}
          </button>
        </label>

        {mapPickTarget ? (
          <p>
            Click on the map to choose the {mapPickTarget} point. It will be saved as coordinates and routed dynamically.
          </p>
        ) : null}

        <datalist id="dynamic-place-suggestions">
          {suggestions.map((node) => (
            <option
              key={node.nodeId}
              value={node.label}
              label={`${node.label} (${node.coordinates?.lat?.toFixed?.(4) ?? '-'}, ${node.coordinates?.lng?.toFixed?.(4) ?? '-'})`}
            />
          ))}
        </datalist>

        <ModeSelector
          options={modeOptions}
          selectedModes={selectedModes}
          onChange={setSelectedModes}
        />

        <div className="planner-actions">
          <button type="submit" className="primary-btn" disabled={isLoadingRoute}>
            {isLoadingRoute ? 'Planning...' : 'Plan Route'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            disabled={!routeResult || isApplyingAnomaly}
            onClick={handleSimulateAnomaly}
          >
            {isApplyingAnomaly ? 'Applying...' : 'Simulate Congestion'}
          </button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {isLoadingRoute || isApplyingAnomaly ? <Loader label="Updating transit graph..." /> : null}
      </form>

      <div className="planner-visual">
        <MapView
          center={mapCenter}
          route={visualRoute}
          nodeCoordinates={nodeCoordinates}
          mapPicker={{
            enabled: Boolean(mapPickTarget),
            target: mapPickTarget,
            onPick: handleMapPick,
            marker: pickedLocation
          }}
        />
        <RouteDisplay baseRoute={routeResult} rerouted={reroutedResult} />
        {!authUser ? (
          <article className="planner-recommendation">
            <strong>Strongly recommended: create a profile to save your routes.</strong>
            <p>
              You can use the Route Planner without logging in, but creating a profile lets you keep
              your favorite trips and come back to them anytime.
            </p>
            <div className="planner-recommendation-actions">
              <button type="button" className="primary-btn" onClick={() => navigateTo('register')}>
                Create Profile
              </button>
              <button type="button" className="secondary-btn" onClick={() => navigateTo('login')}>
                Login
              </button>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
