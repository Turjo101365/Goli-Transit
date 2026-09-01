import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { WeatherBadge } from './WeatherBadge.jsx';

const NAV_ITEMS = [
  { to: '/map', bn: 'মানচিত্র', en: 'Transit Map' },
  { to: '/live', bn: 'লাইভ জার্নি', en: 'Live Journey' },
  { to: '/belt', bn: 'জ্যাম বেল্ট', en: 'Traffic Belt' }
];

const PRESET_ICONS = {
  'preset:metro': '🚇',
  'preset:bus': '🚌',
  'preset:rickshaw': '🛺',
  'preset:cng': '🚕',
  'preset:train': '🚆',
  'preset:bike': '🛵',
  'preset:walk': '🚶',
  'preset:captain': '🛡️'
};

function renderUserAvatar(avatarUrl, size = 15) {
  if (avatarUrl && PRESET_ICONS[avatarUrl]) {
    return <span style={{ fontSize: size }}>{PRESET_ICONS[avatarUrl]}</span>;
  }
  if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image'))) {
    return <img src={avatarUrl} alt="Avatar" style={{ width: size + 4, height: size + 4, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Header({ authUser, onLogout }) {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = ['/login', '/admin/login', '/register', '/forgot-password', '/verify-code', '/reset-password'].includes(
    location.pathname
  );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const userName = authUser?.name || (authUser?.email ? authUser.email.split('@')[0] : (authUser?.isGuest ? (lang === 'bn' ? 'গেস্ট' : 'Guest') : 'User'));

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Left: Brand Logo */}
        <NavLink to="/" className="header-brand" onClick={closeMobileMenu} aria-label="EZZ GO home">
          <img
            src="/brand/ezz-go-logo.png"
            alt="EZZ GO"
            className="header-logo-full"
            width="340"
            height="82"
          />
        </NavLink>

        {/* Center: Desktop Navigation */}
        {authUser ? (
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
                  `header-nav-link header-nav-link--admin ${isActive ? 'header-nav-link--active' : ''}`
                }
              >
                <span className="admin-badge-shield">🛡️</span> {lang === 'en' ? 'Admin' : 'অ্যাডমিন'}
              </NavLink>
            )}
          </nav>
        ) : null}

        {/* Right: Header Actions */}
        <div className="header-actions">
          {/* Utility Tools */}
          <div className="header-tools">
            <WeatherBadge compact={true} />
            <ThemeToggle className="header-icon-btn" />
            <button
              type="button"
              onClick={toggleLang}
              className="header-action-btn header-lang-btn"
              aria-label="Switch Language"
              title={lang === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'}
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>
          </div>

          <div className="header-divider" aria-hidden="true" />

          {/* Account / User section */}
          {authUser ? (
            <div className="user-controls">
              <NavLink
                to="/profile"
                className={({ isActive }) => `user-badge ${isActive ? 'user-badge--active' : ''}`}
                title={authUser.email || authUser.name || 'Profile'}
                aria-label="View Profile"
              >
                <span className="user-badge-avatar">
                  {renderUserAvatar(authUser?.avatarUrl, 15)}
                </span>
                <span className="user-badge-name">{userName}</span>
              </NavLink>

              {authUser.isGuest && (
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="header-action-btn header-action-btn--highlight"
                  title={lang === 'en' ? 'Save your guest account' : 'গেস্ট অ্যাকাউন্ট সেভ করুন'}
                >
                  {lang === 'en' ? 'Save' : 'সেভ'}
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="header-action-btn header-action-btn--logout"
                title={lang === 'en' ? 'Logout' : 'লগআউট'}
                aria-label="Logout"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="btn-text-responsive">{lang === 'en' ? 'Logout' : 'লগআউট'}</span>
              </button>
            </div>
          ) : !isAuthPage ? (
            <div className="auth-buttons">
              <button
                type="button"
                onClick={() => navigate('/admin/login')}
                className="btn-header-admin"
                title={lang === 'en' ? 'Admin Portal Sign In' : 'অ্যাডমিন পোর্টাল লগইন'}
              >
                <span className="admin-badge-shield">🛡️</span> {lang === 'en' ? 'Admin' : 'অ্যাডমিন'}
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
            className={`mobile-hamburger-btn ${mobileMenuOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
          {authUser ? (
            <div className="mobile-user-card">
              <div className="mobile-user-avatar">
                {renderUserAvatar(authUser?.avatarUrl, 20)}
              </div>
              <div className="mobile-user-info">
                <div className="mobile-user-name">{userName}</div>
                <div className="mobile-user-sub">
                  {authUser.isGuest ? (lang === 'bn' ? 'গেস্ট সেশন' : 'Guest Session') : (authUser.email || 'Commuter')}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mobile-menu-links">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`
              }
            >
              {lang === 'en' ? 'Home' : 'হোম'}
            </NavLink>

            {authUser ? (
              <>
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
                <NavLink
                  to="/profile"
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `mobile-nav-link ${isActive ? 'mobile-nav-link--active' : ''}`
                  }
                >
                  {lang === 'en' ? 'Profile' : 'প্রোফাইল'}
                </NavLink>
                {(authUser?.role === 'admin' || authUser?.role === 'moderator') && (
                  <NavLink
                    to="/admin"
                    onClick={closeMobileMenu}
                    className={({ isActive }) =>
                      `mobile-nav-link mobile-nav-link--admin ${isActive ? 'mobile-nav-link--active' : ''}`
                    }
                  >
                    🛡️ {lang === 'en' ? 'Admin Panel' : 'অ্যাডমিন প্যানেল'}
                  </NavLink>
                )}
              </>
            ) : null}
          </div>

          <div className="mobile-menu-footer">
            {authUser ? (
              <div className="mobile-footer-actions">
                {authUser.isGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      navigate('/register');
                    }}
                    className="header-action-btn header-action-btn--highlight mobile-btn-full"
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
                  className="header-action-btn header-action-btn--logout mobile-btn-full"
                >
                  {lang === 'en' ? 'Logout' : 'লগআউট'}
                </button>
              </div>
            ) : (
              <div className="mobile-auth-grid">
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    navigate('/admin/login');
                  }}
                  className="btn-header-admin mobile-btn-full"
                  style={{ gridColumn: '1 / -1' }}
                >
                  🛡️ {lang === 'en' ? 'Admin Portal Sign In' : 'অ্যাডমিন পোর্টাল লগইন'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    navigate('/login');
                  }}
                  className="btn-header-login"
                  style={{ width: '100%', justifyContent: 'center' }}
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
                  style={{ width: '100%', justifyContent: 'center' }}
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
