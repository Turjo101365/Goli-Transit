export function Home({ onStart }) {
  return (
    <section className="home-page fade-in">
      <div className="hero">
        <h2>Plan smarter city movement</h2>
        <p>
          Compare multi-modal routes, simulate congestion anomalies, and show instant rerouting in a
          clean hackathon demo.
        </p>
        <button type="button" className="primary-btn" onClick={onStart}>
          Open Route Planner
        </button>
      </div>
      <div className="home-grid">
        <article className="info-card">
          <h3>Live Route Query</h3>
          <p>Hit the /route API with selected source, destination, and preferred transport modes.</p>
        </article>
        <article className="info-card">
          <h3>Anomaly Simulation</h3>
          <p>Trigger /anomaly to increase edge congestion and visualize immediate rerouting.</p>
        </article>
        <article className="info-card">
          <h3>Map-first Story</h3>
          <p>Render route legs and stop nodes visually so judges can follow the decision path.</p>
        </article>
      </div>
    </section>
  );
}