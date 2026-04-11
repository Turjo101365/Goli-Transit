function displayPath(route) {
  if (Array.isArray(route.pathNodeDetails) && route.pathNodeDetails.length > 0) {
    return route.pathNodeDetails.map((entry) => entry.label || entry.nodeId).join(' -> ');
  }

  if (Array.isArray(route.pathNodes)) {
    return route.pathNodes.join(' -> ');
  }

  return '';
}

function RouteCard({ title, route }) {
  if (!route) {
    return (
      <article className="route-card muted">
        <h3>{title}</h3>
        <p>No route yet.</p>
      </article>
    );
  }

  return (
    <article className="route-card">
      <h3>{title}</h3>
      <p>
        Total cost: <strong>{route.totalCost}</strong> | Compute: {route.computeTimeMs ?? '-'} ms
      </p>
      {typeof route.totalDistanceKm === 'number' ? (
        <p>
          Total distance: <strong>{route.totalDistanceKm} km</strong>
        </p>
      ) : null}
      {typeof route.totalSwitchPenalty === 'number' ? (
        <p>
          Switch penalty: <strong>{route.totalSwitchPenalty}</strong>
        </p>
      ) : null}
      {Array.isArray(route.pathNodes) ? (
        <p>
          Path: <strong>{displayPath(route)}</strong>
        </p>
      ) : null}
      <ol>
        {route.legs.map((leg, index) => (
          <li key={`${leg.from}-${leg.to}-${index}`}>
            {(leg.fromLabel || leg.from)} to {(leg.toLabel || leg.to)} via {leg.transportMode || leg.mode}
            {typeof leg.distanceKm === 'number' ? ` (${leg.distanceKm} km)` : ''}
            {' '}
            (weight {leg.weight})
          </li>
        ))}
      </ol>
    </article>
  );
}

export function RouteDisplay({ baseRoute, rerouted }) {
  return (
    <section className="route-display">
      <RouteCard title="Initial Route" route={baseRoute} />
      <RouteCard title="After Anomaly" route={rerouted} />
    </section>
  );
}