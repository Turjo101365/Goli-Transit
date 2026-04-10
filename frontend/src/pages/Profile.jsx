function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function Profile({ user, onOpenPlanner, onLogout }) {
  return (
    <section className="profile-page fade-in">
      <article className="profile-hero">
        <div>
          <span className="auth-kicker">Account Center</span>
          <h2>{user.name}</h2>
          <p>Your authenticated GoliTransit rider profile is now active.</p>
        </div>
        <div className="profile-hero-actions">
          <button type="button" className="primary-btn" onClick={onOpenPlanner}>
            Open Route Planner
          </button>
          <button type="button" className="secondary-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </article>

      <div className="profile-grid">
        <article className="profile-card">
          <h3>Profile Details</h3>
          <dl className="profile-details">
            <div>
              <dt>Full Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd>{user.id}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </article>

        <article className="profile-card">
          <h3>Authenticated Features</h3>
          <ul className="profile-list">
            <li>Protected route planning requests with bearer JWT authentication.</li>
            <li>Password reset flow backed by MySQL token storage.</li>
            <li>Persistent session restore using `/auth/me` on reload.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
