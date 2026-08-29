import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

const NAV_ITEMS = [
  { to: '/map', bn: 'মানচিত্র', en: 'Transit Map' },
  { to: '/live', bn: 'লাইভ জার্নি', en: 'Live Journey' },
  { to: '/belt', bn: 'জ্যাম বেল্ট', en: 'Traffic Belt' }
];

export function Header({ authUser, onLogout }) {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = ['/login', '/register', '/forgot-password', '/verify-code', '/reset-password'].includes(
    location.pathname
  );

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Brand Logo & Name */}
        <NavLink to="/" className="header-brand" onClick={closeMobileMenu}>
          <div className="header-logo-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
              <rect width="36" height="36" rx="9" fill="#F2A878" />
              <text x="17" y="25" textAnchor="middle" fontFamily="var(--head)" fontSize="19" fontWeight="800" fill="#221F1C">ফ</text>
              <circle cx="31" cy="6" r="4.5" fill="#C3E2A6" />
            </svg>
          </div>
          <div className="header-brand-text">
            <span className="brand-title">ফুরুৎ</span>
            <span className="brand-sub">ঢাকা</span>
          </div>
        </NavLink>

        {/* Desktop Navigation — the app screens only make sense once signed in */}
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
          </nav>
        ) : null}

        {/* Header Right Actions */}
        <div className="header-actions">
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
              {authUser.isGuest ? (
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="action-chip action-chip--highlight"
                >
                  {lang === 'en' ? 'Save Account' : 'অ্যাকাউন্ট সেভ'}
                </button>
              ) : (
                <span className="user-badge" title={authUser.email || authUser.name}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>{authUser.name || (authUser.email ? authUser.email.split('@')[0] : 'User')}</span>
                </span>
              )}
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
          {authUser ? (
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
