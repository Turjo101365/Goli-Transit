import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { WeatherBadge } from './WeatherBadge.jsx';

const NAV_ITEMS = [
  { to: '/map', bn: 'মানচিত্র', en: 'Transit Map' },
  { to: '/live', bn: 'লাইভ জার্নি', en: 'Live Journey' },
  { to: '/belt', bn: 'জ্যাম বেল্ট', en: 'Traffic Belt' },
  { to: '/profile', bn: 'প্রোফাইল', en: 'Profile' }
];

export function Header({ authUser, onLogout }) {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/verify-code', '/reset-password'].includes(
    location.pathname
  );
  // The landing page is marketing copy, not an app screen — Map/Live/Belt
  // links belong on the actual app screens, not here, even when signed in.
  const isLandingPage = location.pathname === '/';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Brand logo — the full logo already carries the EZZ GO wordmark, so
            no separate brand-name text is rendered beside it (desktop); the
            compact icon (no wordmark) is used below the 860px breakpoint the
            rest of this header already switches on. */}
        <NavLink to="/" className="header-brand" onClick={closeMobileMenu} aria-label="EZZ GO home">
          <img
            src="/brand/ezz-go-logo.png"
            alt="EZZ GO — out before the jam"
            className="header-logo-full"
            width="176"
            height="99"
          />
          <img
            src="/brand/ezz-go-icon.png"
            alt="EZZ GO"
            className="header-logo-compact"
            width="40"
            height="40"
          />
        </NavLink>

        {/* Desktop Navigation — the app screens only make sense once signed in, and never on the landing page */}
        {authUser && !isLandingPage ? (
          <nav className="header-nav" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`
                }
              >
                {lang === 'en' ? item.en : item.bn}
              </NavLink>
            ))}
            {(authUser?.role === 'admin' || authUser?.role === 'moderator') && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `header-nav-link ${isActive ? 'header-nav-link--active' : ''}`
                }
                style={{ color: 'var(--metro)', fontWeight: 700 }}
              >
                🛡️ {lang === 'en' ? 'Admin' : 'অ্যাডমিন'}
              </NavLink>
            )}
          </nav>
        ) : null}

        {/* Header Right Actions */}
        <div className="header-actions">
          <WeatherBadge />
          <ThemeToggle />

          <button
            type="button"
            onClick={toggleLang}
            className="action-chip"
            aria-label="Switch Language"
          >
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>

          {authUser ? (
            <div className="user-controls">
              <NavLink
                to="/profile"
                className={({ isActive }) => `user-badge ${isActive ? 'user-badge--active' : ''}`}
                title={authUser.email || authUser.name || 'Profile'}
                aria-label="View Profile"
                style={{ textDecoration: 'none', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>
                  {authUser.name || (authUser.email ? authUser.email.split('@')[0] : (authUser.isGuest ? (lang === 'bn' ? 'গেস্ট' : 'Guest') : 'User'))}
                </span>
              </NavLink>

              {authUser.isGuest ? (
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="action-chip action-chip--highlight"
                >
                  {lang === 'en' ? 'Save Account' : 'অ্যাকাউন্ট সেভ'}
                </button>
              ) : null}

              <button
                type="button"
                onClick={onLogout}
                className="action-chip action-chip--logout"
              >
                {lang === 'en' ? 'Logout' : 'লগআউট'}
              </button>
            </div>
          ) : !isAuthPage ? (
            <div className="auth-buttons">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-header-login"
                style={{ borderColor: 'var(--metro)', color: 'var(--metro)' }}
                title="Admin Sign In"
              >
                🛡️ {lang === 'en' ? 'Admin' : 'অ্যাডমিন'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn-header-login"
              >
                {lang === 'en' ? 'Log in' : 'লগইন'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="btn-header-register"
              >
                {lang === 'en' ? 'Sign Up' : 'সাইন আপ'}
              </button>
            </div>
          ) : null}

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          {authUser && !isLandingPage ? (
            <div className="mobile-menu-links">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`
                  }
                >
                  {lang === 'en' ? item.en : item.bn}
                </NavLink>
              ))}
              {(authUser?.role === 'admin' || authUser?.role === 'moderator') && (
                <NavLink
                  to="/admin"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`
                  }
                  style={{ color: 'var(--metro)', fontWeight: 700 }}
                >
                  🛡️ {lang === 'en' ? 'Admin Panel' : 'অ্যাডমিন প্যানেল'}
                </NavLink>
              )}
            </div>
          ) : null}

          <div className="mobile-menu-footer">
            {authUser ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {authUser.isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      navigate('/register');
                    }}
                    className="action-chip action-chip--highlight"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {lang === 'en' ? 'Save Account' : 'অ্যাকাউন্ট সেভ করুন'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    onLogout();
                  }}
                  className="action-chip action-chip--logout"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {lang === 'en' ? 'Logout' : 'লগআউট'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    navigate('/login');
                  }}
                  className="btn-header-login"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  {lang === 'en' ? 'Log in' : 'লগইন'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    navigate('/register');
                  }}
                  className="btn-header-register"
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  {lang === 'en' ? 'Sign Up' : 'সাইন আপ'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
