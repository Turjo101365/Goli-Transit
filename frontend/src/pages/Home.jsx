export function Home({ authUser, onStart, onLogin, onRegister, onProfile }) {
  return (
    <section className="home-page fade-in">
      <div className="hero">
        <h2>Plan smarter city movement</h2>
        <p>
          Compare multi-modal routes, simulate congestion anomalies, and show instant rerouting in a
          clean hackathon demo.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-btn" onClick={onStart}>
            {authUser ? 'Continue as ' + authUser.name : 'Login to Open Planner'}
          </button>
          {!authUser ? (
            <>
              <button type="button" className="secondary-btn" onClick={onLogin}>
                Login
              </button>
              <button type="button" className="secondary-btn" onClick={onRegister}>
                Register
              </button>
            </>
          ) : (
            <button type="button" className="secondary-btn" onClick={onProfile}>
              View Profile
            </button>
          )}
        </div>
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
        <article className="info-card">
          <h3>Secure Access</h3>
          <p>Register and login with a database-backed account before opening the planner tools.</p>
        </article>
        <article className="info-card">
          <h3>Password Recovery</h3>
          <p>Use forgot-password and reset-password screens to demonstrate a complete auth journey.</p>
        </article>
      </div>
    </section>
  );
}
