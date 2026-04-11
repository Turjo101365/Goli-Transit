import { useEffect, useState } from 'react';
import {
  getProfile,
  updateProfile,
  saveRoute,
  deleteSavedRoute,
  addFavoriteStop,
  deleteFavoriteStop
} from '../services/profile.service.js';
import { Loader } from '../components/UI/Loader.jsx';

const settingsOptions = [
  { id: 1, label: 'Notifications', description: 'Refresh your latest account activity', action: 'refresh' },
  { id: 2, label: 'Privacy', description: 'Jump into profile editing', action: 'edit' },
  { id: 3, label: 'Security', description: 'Copy your user ID for support', action: 'copyId' },
  { id: 4, label: 'Help & Support', description: 'Open a support contact flow', action: 'support' },
  { id: 5, label: 'Accessibility', description: 'Toggle a compact view mode', action: 'compact' },
];

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString();
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
}

export function Profile({ user, onOpenPlanner, onLogout }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [routeForm, setRouteForm] = useState({
    name: '',
    fromLocation: '',
    toLocation: '',
    mode: 'walk',
    durationMinutes: ''
  });
  const [stopForm, setStopForm] = useState({
    name: '',
    nodeId: ''
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await getProfile();
        setProfileData(data);
        setEditForm({ name: data.user.name, email: data.user.email });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function refreshProfile() {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await getProfile();
      setProfileData(data);
      setEditForm({ name: data.user.name, email: data.user.email });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveProfile() {
    try {
      const updated = await updateProfile(editForm);
      setProfileData((prev) => ({
        ...prev,
        user: updated.user
      }));
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveRoute(event) {
    event.preventDefault();
    try {
      setIsSavingRoute(true);
      setError(null);

      const result = await saveRoute({
        ...routeForm,
        durationMinutes: routeForm.durationMinutes ? Number(routeForm.durationMinutes) : null
      });

      setProfileData((prev) => ({
        ...prev,
        savedRoutes: [
          {
            id: result.id,
            userId: userData?.id,
            name: routeForm.name,
            fromLocation: routeForm.fromLocation,
            toLocation: routeForm.toLocation,
            mode: routeForm.mode,
            durationMinutes: routeForm.durationMinutes ? Number(routeForm.durationMinutes) : null,
            createdAt: new Date().toISOString()
          },
          ...(prev.savedRoutes || [])
        ]
      }));

      setRouteForm({
        name: '',
        fromLocation: '',
        toLocation: '',
        mode: 'walk',
        durationMinutes: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingRoute(false);
    }
  }

  async function handleAddStop(event) {
    event.preventDefault();
    try {
      setIsAddingStop(true);
      setError(null);

      const result = await addFavoriteStop({
        name: stopForm.name,
        nodeId: stopForm.nodeId || null
      });

      setProfileData((prev) => ({
        ...prev,
        favoriteStops: [
          {
            id: result.id,
            userId: userData?.id,
            name: stopForm.name,
            nodeId: stopForm.nodeId || null,
            latitude: null,
            longitude: null,
            createdAt: new Date().toISOString()
          },
          ...(prev.favoriteStops || [])
        ]
      }));

      setStopForm({
        name: '',
        nodeId: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAddingStop(false);
    }
  }

  async function handleDeleteRoute(routeId) {
    try {
      await deleteSavedRoute(routeId);
      setProfileData((prev) => ({
        ...prev,
        savedRoutes: prev.savedRoutes.filter((r) => r.id !== routeId)
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStop(stopId) {
    try {
      await deleteFavoriteStop(stopId);
      setProfileData((prev) => ({
        ...prev,
        favoriteStops: prev.favoriteStops.filter((s) => s.id !== stopId)
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <section className="profile-page fade-in">
        <Loader label="Loading profile..." />
      </section>
    );
  }

  const userData = profileData?.user || user;
  const stats = profileData?.stats || { totalTrips: 0, savedRoutesCount: 0, favoriteStopsCount: 0 };
  const trips = profileData?.trips || [];
  const savedRoutes = profileData?.savedRoutes || [];
  const favoriteStops = profileData?.favoriteStops || [];
  const totalDistance = Number(stats.totalDistance || 0);
  const lastTrip = trips[0];
  const topRoute = savedRoutes[0];
  const profileCompletion = Math.round(
    [userData?.name, userData?.email, userData?.id, userData?.createdAt].filter(Boolean).length / 4 * 100
  );

  async function copyUserId() {
    try {
      await navigator.clipboard.writeText(String(userData?.id || ''));
      setCopiedUserId(true);
      window.setTimeout(() => setCopiedUserId(false), 1800);
    } catch {
      setError('Unable to copy user ID right now.');
    }
  }

  function handleSettingAction(action) {
    if (action === 'refresh') {
      setSettingsMessage('Refreshing your profile data...');
      refreshProfile();
      return;
    }

    if (action === 'edit') {
      setIsEditing(true);
      setSettingsMessage('Profile edit mode opened.');
      return;
    }

    if (action === 'copyId') {
      void copyUserId();
      setSettingsMessage('User ID copied to clipboard.');
      return;
    }

    if (action === 'support') {
      window.location.href = 'mailto:abcd@golitranist.com?subject=GoliTransit%20Profile%20Support';
      setSettingsMessage('Opening your email app for support.');
      return;
    }

    if (action === 'compact') {
      setIsCompactView((current) => {
        const next = !current;
        setSettingsMessage(next ? 'Compact mode enabled.' : 'Compact mode disabled.');
        return next;
      });
    }
  }

  return (
    <section className={`profile-page fade-in ${isCompactView ? 'profile-page-compact' : ''}`}>
      {error && (
        <div className="error-banner" style={{ padding: '12px', background: '#fee', color: '#c00', marginBottom: '16px', borderRadius: '8px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '12px', border: 'none', background: 'transparent', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* HERO SECTION */}
      <article className="profile-hero glass-card">
        <div className="profile-hero-left">
          <div className="profile-avatar">
            {(userData?.name || 'G').charAt(0).toUpperCase()}
          </div>
          <div className="profile-hero-copy">
            <span className="auth-kicker">Account Center</span>
            <h2 className="profile-name">
              {userData?.name || "Guest User"}
            </h2>

            <div className="profile-meta-grid">
              <div className="profile-meta-item">
                <span className="profile-meta-label">Member since</span>
                <strong>{formatDate(userData?.createdAt)}</strong>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Profile health</span>
                <strong>{profileCompletion}% complete</strong>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Last trip</span>
                <strong>{lastTrip ? formatTimeAgo(lastTrip.completedAt) : 'No trips yet'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button
            type="button"
            className="primary-btn glow"
            onClick={onOpenPlanner}
          >
            Plan New Route
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={refreshProfile}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Profile'}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </article>

      <section className="profile-summary-grid">
        <article className="profile-summary-card">
          <span className="profile-summary-label">Trips Taken</span>
          <strong className="profile-summary-value">{stats.totalTrips}</strong>
          <span className="profile-summary-note">Across all completed journeys</span>
        </article>

        <article className="profile-summary-card">
          <span className="profile-summary-label">Saved Routes</span>
          <strong className="profile-summary-value">{savedRoutes.length}</strong>
          <span className="profile-summary-note">Ready to reuse on your next trip</span>
        </article>

        <article className="profile-summary-card">
          <span className="profile-summary-label">Favorite Stops</span>
          <strong className="profile-summary-value">{favoriteStops.length}</strong>
          <span className="profile-summary-note">Pinned locations you visit often</span>
        </article>

        <article className="profile-summary-card">
          <span className="profile-summary-label">Distance Traveled</span>
          <strong className="profile-summary-value">{totalDistance}</strong>
          <span className="profile-summary-note">Kilometers tracked in your account</span>
        </article>
      </section>

      {/* MAIN GRID */}
      <div className="profile-grid">

        {/* DETAILS CARD */}
        <article className="profile-card hover-lift">
          <div className="card-header">
            <h3>Profile Details</h3>
            <div className="card-header-actions">
              <button
                type="button"
                className="text-btn"
                onClick={copyUserId}
                title="Copy user ID"
              >
                {copiedUserId ? 'Copied' : 'Copy ID'}
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Edit"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Close' : 'Edit'}
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="edit-form">
              <div className="edit-grid">
                <div className="floating-group compact">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder=" "
                  />
                  <label>Full Name</label>
                </div>

                <div className="floating-group compact">
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder=" "
                  />
                  <label>Email</label>
                </div>
              </div>

              <div className="edit-actions">
                <button type="button" className="primary-btn" onClick={handleSaveProfile}>Save changes</button>
                <button type="button" className="secondary-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <dl className="profile-details">
                <div>
                  <dt>Full Name</dt>
                  <dd>{userData?.name}</dd>
                </div>

                <div>
                  <dt>Email</dt>
                  <dd>{userData?.email}</dd>
                </div>

                <div>
                  <dt>User ID</dt>
                  <dd className="mono">{userData?.id}</dd>
                </div>

                <div>
                  <dt>Joined</dt>
                  <dd>{formatDate(userData?.createdAt)}</dd>
                </div>
              </dl>

              <div className="profile-footnote">
                <span className="profile-footnote-label">Session snapshot</span>
                <div className="profile-footnote-row">
                  <span>Active since {formatDate(userData?.createdAt)}</span>
                  <span>{profileCompletion}% profile completeness</span>
                </div>
              </div>
            </>
          )}
        </article>

        {/* STATS CARD */}
        <article className="profile-card hover-lift">
          <div className="card-header">
            <h3>Travel Stats</h3>
            <span className="badge info">All Time</span>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-number">{stats.totalTrips}</span>
              <span className="stat-label">Trips Taken</span>
            </div>

            <div className="stat-box">
              <span className="stat-number">{savedRoutes.length}</span>
              <span className="stat-label">Saved Routes</span>
            </div>

            <div className="stat-box">
              <span className="stat-number">{favoriteStops.length}</span>
              <span className="stat-label">Favorite Stops</span>
            </div>

            <div className="stat-box">
              <span className="stat-number">{totalDistance}</span>
              <span className="stat-label">km Traveled</span>
            </div>
          </div>

          <div className="profile-mini-summary">
            <div>
              <span className="profile-mini-label">Last route</span>
              <strong>{lastTrip ? `${lastTrip.fromLocation} -> ${lastTrip.toLocation}` : 'No routes yet'}</strong>
            </div>
            <div>
              <span className="profile-mini-label">Top saved route</span>
              <strong>{topRoute?.name || 'No saved routes yet'}</strong>
            </div>
          </div>
        </article>

        {/* RECENT ACTIVITY */}
        <article className="profile-card hover-lift activity-card">
          <div className="card-header">
            <h3>Recent Trips</h3>
          </div>

          {trips.length === 0 ? (
            <div className="profile-empty-state">
              <strong>No trips yet</strong>
              <p>Plan your first route and your recent journeys will appear here.</p>
            </div>
          ) : (
            <div className="activity-list">
              {trips.slice(0, 5).map((trip) => (
                <div key={trip.id} className="activity-item">
                  <div className={`activity-icon ${trip.status}`}></div>
                  <div className="activity-details">
                    <span className="activity-route">{trip.fromLocation} -&gt; {trip.toLocation}</span>
                    <span className="activity-time">{formatTimeAgo(trip.completedAt)}</span>
                  </div>
                  <span className={`badge ${trip.status === 'completed' ? 'success' : 'info'}`}>
                    {trip.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* SAVED ROUTES */}
        <article className="profile-card hover-lift">
          <div className="card-header">
            <h3>Saved Routes</h3>
            <div className="card-header-actions">
              <button type="button" className="text-btn" onClick={onOpenPlanner}>+ Add New</button>
            </div>
          </div>

          <form className="inline-create-form" onSubmit={handleSaveRoute}>
            <div className="inline-create-grid">
              <input
                type="text"
                placeholder="Route name"
                value={routeForm.name}
                onChange={(e) => setRouteForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="From"
                value={routeForm.fromLocation}
                onChange={(e) => setRouteForm((current) => ({ ...current, fromLocation: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="To"
                value={routeForm.toLocation}
                onChange={(e) => setRouteForm((current) => ({ ...current, toLocation: e.target.value }))}
                required
              />
              <select
                value={routeForm.mode}
                onChange={(e) => setRouteForm((current) => ({ ...current, mode: e.target.value }))}
              >
                <option value="walk">Walk</option>
                <option value="bike">Bike</option>
                <option value="bus">Bus</option>
                <option value="metro">Metro</option>
              </select>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Duration min"
                value={routeForm.durationMinutes}
                onChange={(e) => setRouteForm((current) => ({ ...current, durationMinutes: e.target.value }))}
              />
            </div>
            <button type="submit" className="primary-btn" disabled={isSavingRoute}>
              {isSavingRoute ? 'Saving...' : 'Save route'}
            </button>
          </form>

          {savedRoutes.length === 0 ? (
            <div className="profile-empty-state">
              <strong>No saved routes</strong>
              <p>Plan a route and save it for one-tap reuse later.</p>
            </div>
          ) : (
            <div className="routes-list">
              {savedRoutes.slice(0, 4).map((route) => (
                <div key={route.id} className="route-item">
                  <div className="route-details">
                    <span className="route-name">{route.name}</span>
                    <span className="route-path">{route.fromLocation} -&gt; {route.toLocation}</span>
                  </div>
                  <div className="route-meta">
                    <span className="route-duration">{route.durationMinutes ? `${route.durationMinutes} min` : ''}</span>
                    <span className="badge">{route.mode || 'Route'}</span>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteRoute(route.id)}
                      style={{ marginLeft: '8px', padding: '4px 8px', background: '#fee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* FAVORITE STOPS */}
        <article className="profile-card hover-lift">
          <div className="card-header">
            <h3>Favorite Stops</h3>
            <button type="button" className="text-btn" onClick={onOpenPlanner}>Manage</button>
          </div>

          <form className="inline-create-form" onSubmit={handleAddStop}>
            <div className="inline-create-grid inline-create-grid-2">
              <input
                type="text"
                placeholder="Stop name"
                value={stopForm.name}
                onChange={(e) => setStopForm((current) => ({ ...current, name: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Node ID"
                value={stopForm.nodeId}
                onChange={(e) => setStopForm((current) => ({ ...current, nodeId: e.target.value }))}
              />
            </div>
            <button type="submit" className="primary-btn" disabled={isAddingStop}>
              {isAddingStop ? 'Adding...' : 'Add favorite stop'}
            </button>
          </form>

          {favoriteStops.length === 0 ? (
            <div className="profile-empty-state">
              <strong>No favorite stops</strong>
              <p>Add stops from the map and keep your common places close.</p>
            </div>
          ) : (
            <div className="stops-list">
              {favoriteStops.slice(0, 6).map((stop) => (
                <div key={stop.id} className="stop-item">
                  <span className="stop-name">{stop.name}</span>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteStop(stop.id)}
                    style={{ marginLeft: '8px', padding: '4px 8px', background: '#fee', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        {/* SETTINGS */}
        <article className="profile-card hover-lift">
          <div className="card-header">
            <h3>Settings</h3>
            <span className={`badge ${isCompactView ? 'success' : 'info'}`}>
              {isCompactView ? 'Compact view on' : 'Quick tools'}
            </span>
          </div>

          {settingsMessage ? (
            <div className="settings-message" role="status">
              {settingsMessage}
            </div>
          ) : null}

          <div className="settings-list">
            {settingsOptions.map((setting) => (
              <button
                key={setting.id}
                type="button"
                className="setting-item"
                aria-pressed={setting.action === 'compact' ? isCompactView : undefined}
                onClick={() => handleSettingAction(setting.action)}
              >
                <div className="setting-details">
                  <span className="setting-label">{setting.label}</span>
                  <span className="setting-desc">{setting.description}</span>
                </div>
                <span className="setting-arrow">
                  {setting.action === 'compact'
                    ? isCompactView
                      ? 'On'
                      : 'Off'
                    : '\u203a'}
                </span>
              </button>
            ))}
          </div>
        </article>

      </div>
    </section>
  );
}
