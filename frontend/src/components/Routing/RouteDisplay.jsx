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
      <ol>
        {route.legs.map((leg, index) => (
          <li key={`${leg.from}-${leg.to}-${index}`}>
            {leg.from} to {leg.to} via {leg.mode} (weight {leg.weight})
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