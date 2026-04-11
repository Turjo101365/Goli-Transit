import { useMemo, useState } from 'react';
import { MapView } from '../components/Map/MapView.jsx';
import { ModeSelector } from '../components/Routing/ModeSelector.jsx';
import { RouteDisplay } from '../components/Routing/RouteDisplay.jsx';
import { createRoute } from '../services/route.service.js';
import { createAnomaly } from '../services/anomaly.service.js';
import { Loader } from '../components/UI/Loader.jsx';

const modeOptions = ['walk', 'bike', 'bus', 'metro'];
const nodeOptions = ['A', 'B', 'C', 'D'];

export const nodeCoordinates = {
A: [23.80, 90.41], // Gulshan
  B: [23.74, 90.38], // Dhanmondi
  C: [23.81, 90.37], // Mirpur
  D: [23.73, 90.41] // Motijheel
};

export function RoutePlanner({ authUser, activeSection, setActiveSection, scrollToSection, navigateTo, page }) {
  const [source, setSource] = useState('A');
  const [destination, setDestination] = useState('C');
  const [selectedModes, setSelectedModes] = useState(['walk', 'bike', 'bus', 'metro']);
  const [routeResult, setRouteResult] = useState(null);
  const [reroutedResult, setReroutedResult] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isApplyingAnomaly, setIsApplyingAnomaly] = useState(false);
  const [error, setError] = useState('');

  const visualRoute = reroutedResult || routeResult;

const mapCenter = [23.8103, 90.4125]; // Fixed Dhaka center

  async function handlePlanRoute(event) {
    event.preventDefault();
    setError('');
    setReroutedResult(null);
setIsLoadingRoute(true); // Step 1: Dhaka coordinates updated ✓

    try {
      const result = await createRoute({
        origin: source,
        destination,
        preferredModes: selectedModes,
        avoidModes: [],
        vehicleType: null
      });

      setRouteResult(result);
    } catch (apiError) {
      setError(apiError.message || 'Unable to fetch route.');
      setRouteResult(null);
    } finally {
      setIsLoadingRoute(false);
    }
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
        origin: source,
        destination,
        preferredModes: selectedModes,
        avoidModes: [],
        vehicleType: null
      });

      setReroutedResult(nextRoute);
    } catch (apiError) {
      setError(apiError.message || 'Unable to simulate anomaly.');
    } finally {
      setIsApplyingAnomaly(false);
    }
  }

return (
<section className="planner-layout fade-in">

      <form className="planner-panel" onSubmit={handlePlanRoute}>
        <h2>Route Planner</h2>
        <p>Choose source, destination, and transport modes. Then simulate traffic anomalies.</p>

        <label>
          Source
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            {nodeOptions.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </label>

        <label>
          Destination
          <select value={destination} onChange={(event) => setDestination(event.target.value)}>
            {nodeOptions.map((node) => (
              <option key={node} value={node}>
                {node}
              </option>
            ))}
          </select>
        </label>

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
        <MapView center={mapCenter} route={visualRoute} nodeCoordinates={nodeCoordinates} />
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
