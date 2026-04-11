import { useEffect, useState } from 'react';
import { Home } from './pages/Home.jsx';
import { RoutePlanner } from './pages/RoutePlanner.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { VerifyCode } from './pages/VerifyCode.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { Profile } from './pages/Profile.jsx';
import { Loader } from './components/UI/Loader.jsx';
import {
  hasActiveSession,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  resetUserPassword,
  sendResetCode,
  verifyResetCode,
  restoreSession
} from './services/auth.service.js';
import { AUTH_UNAUTHORIZED_EVENT } from './services/auth.storage.js';

const emptyResetPrefill = {
  email: '',
  code: '',
  token: ''
};

const homeSections = new Set(['hero', 'challenge', 'features', 'stats', 'about', 'contact', 'cta']);

const pageQueryParamMap = {
  home: '',
  planner: 'planner',
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
  verifyCode: 'verify-code',
  resetPassword: 'reset-password',
  profile: 'profile'
};

const pageByQueryParam = Object.fromEntries(
  Object.entries(pageQueryParamMap)
    .filter(([, value]) => value)
    .map(([key, value]) => [value, key])
);

function normalizeResetPrefill(prefill = emptyResetPrefill) {
  return {
    email: prefill.email || '',
    code: prefill.code || '',
    token: prefill.token || ''
  };
}

function getInitialResetPrefill() {
  if (typeof window === 'undefined') {
    return emptyResetPrefill;
  }

  const params = new URLSearchParams(window.location.search);

  return {
    email: params.get('email') || '',
    code: params.get('code') || '',
    token: params.get('token') || ''
  };
}

function getInitialPage() {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const authPathMap = {
    '/': 'home',
    '/login': 'login',
    '/register': 'register',
    '/forgot-password': 'forgotPassword',
    '/verify-code': 'verifyCode',
    '/reset-password': 'resetPassword',
    '/profile': 'profile',
    '/planner': 'planner'
  };

  if (authPathMap[pathname]) {
    return authPathMap[pathname];
  }

  const page = new URLSearchParams(window.location.search).get('page');
  return pageByQueryParam[page] || 'home';
}

function getInitialSection() {
  if (typeof window === 'undefined') {
    return 'hero';
  }

  const nextSection = window.location.hash.replace('#', '');
  return homeSections.has(nextSection) ? nextSection : 'hero';
}

function buildPathForPage(nextPage) {
  const authPathMap = {
    home: '/',
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    verifyCode: '/verify-code',
    resetPassword: '/reset-password',
    profile: '/profile',
    planner: '/planner'
  };

  return authPathMap[nextPage] || '/';
}

export default function App() {
  const [page, setPage] = useState(() => getInitialPage());
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [isRestoringSession, setIsRestoringSession] = useState(() => hasActiveSession());
  const [resetPrefill, setResetPrefill] = useState(() => getInitialResetPrefill());
  const [activeSection, setActiveSection] = useState(() => getInitialSection());
  const [targetSection, setTargetSection] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function syncPageToUrl(
    nextPage,
    nextResetPrefill = emptyResetPrefill,
    nextSection = 'hero',
    replace = false
  ) {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const pageQueryValue = pageQueryParamMap[nextPage] || '';
    const normalizedResetPrefill = normalizeResetPrefill(nextResetPrefill);
    const nextPath = buildPathForPage(nextPage);

    if (pageQueryValue) {
      url.searchParams.set('page', pageQueryValue);
    } else {
      url.searchParams.delete('page');
    }

    if (nextPage === 'forgotPassword' || nextPage === 'verifyCode' || nextPage === 'resetPassword') {
      if (normalizedResetPrefill.email) {
        url.searchParams.set('email', normalizedResetPrefill.email);
      } else {
        url.searchParams.delete('email');
      }
    } else {
      url.searchParams.delete('email');
    }

    if (nextPage === 'verifyCode') {
      if (normalizedResetPrefill.code) {
        url.searchParams.set('code', normalizedResetPrefill.code);
      } else {
        url.searchParams.delete('code');
      }
    } else {
      url.searchParams.delete('code');
    }

    if (nextPage === 'resetPassword') {
      if (normalizedResetPrefill.token) {
        url.searchParams.set('token', normalizedResetPrefill.token);
      } else {
        url.searchParams.delete('token');
      }
    } else {
      url.searchParams.delete('token');
    }

    if (nextPage === 'home' && homeSections.has(nextSection) && nextSection !== 'hero') {
      url.hash = nextSection;
    } else {
      url.hash = '';
    }

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', `${nextPath}${url.search}${url.hash}`);
  }

  function navigateTo(nextPage, nextResetPrefill = emptyResetPrefill, options = {}) {
    const normalizedResetPrefill = normalizeResetPrefill(nextResetPrefill);
    const nextSection = nextPage === 'home' ? options.section || 'hero' : 'hero';

    setPage(nextPage);
    setResetPrefill(normalizedResetPrefill);

    if (nextPage === 'home') {
      setActiveSection(nextSection);
      setTargetSection(nextSection);
    } else {
      setTargetSection(null);
    }

    syncPageToUrl(nextPage, normalizedResetPrefill, nextSection, options.replace === true);
  }

  function showToast(message, type = 'success') {
    if (!message) {
      return;
    }

    setToast({ message, type });
  }

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function scrollToSection(sectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openHomeSection(sectionId) {
    navigateTo('home', emptyResetPrefill, { section: sectionId });
  }

  useEffect(() => {
    let isMounted = true;

    async function syncSession() {
      if (!hasActiveSession()) {
        setIsRestoringSession(false);
        return;
      }

      const user = await restoreSession();

      if (!isMounted) {
        return;
      }

      setAuthUser(user);
      setIsRestoringSession(false);
    }

    syncSession();

    function syncStateFromUrl() {
      setPage(getInitialPage());
      setResetPrefill(getInitialResetPrefill());
      setActiveSection(getInitialSection());
      setTargetSection(null);
    }

    function handleUnauthorized() {
      setAuthUser(null);
      navigateTo('login', emptyResetPrefill, { replace: true });
    }

    window.addEventListener('popstate', syncStateFromUrl);
    window.addEventListener('hashchange', syncStateFromUrl);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('popstate', syncStateFromUrl);
      window.removeEventListener('hashchange', syncStateFromUrl);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (page !== 'home' || !targetSection) {
      return;
    }

    if (targetSection === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTargetSection(null);
      return;
    }

    const timer = window.setTimeout(() => {
      scrollToSection(targetSection);
      setTargetSection(null);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [page, targetSection]);

  async function handleLogin(credentials) {
    const user = await loginUser(credentials);
    setAuthUser(user);
    showToast('Welcome back. You are now signed in.');
    navigateTo('profile');
  }

  async function handleRegister(payload) {
    const user = await registerUser(payload);
    setAuthUser(user);
    showToast('Account created successfully.');
    navigateTo('profile');
  }

  async function handleForgotPassword(payload) {
    const result = await sendResetCode(payload);
    showToast(result?.message || 'Verification code sent successfully to your email');
    navigateTo('verifyCode', {
      email: payload.email
    });
    return result;
  }

  async function handleResendCode(payload) {
    const result = await sendResetCode(payload);
    showToast(result?.message || 'New code sent successfully');
    return result;
  }

  async function handleVerifyCode(payload) {
    const result = await verifyResetCode(payload);
    showToast(result?.message || 'Verification code confirmed successfully.');
    navigateTo('resetPassword', {
      email: result?.email || payload.email,
      token: result?.resetToken || ''
    });
    return result;
  }

  async function handleResetPassword(payload) {
    const result = await resetUserPassword(payload);
    showToast(result?.message || 'Password updated successfully');
    navigateTo('login', emptyResetPrefill, { replace: true });
    return result;
  }

  function handleLogout() {
    logoutUser();
    setAuthUser(null);
    navigateTo('home');
  }

  function openPlanner() {
    navigateTo('planner');
  }

  function openProfile() {
    navigateTo(authUser ? 'profile' : 'login');
  }

  function openForgotPassword(email = '') {
    navigateTo('forgotPassword', {
      email,
      code: '',
      token: ''
    });
  }

  function openResetPassword(prefill = emptyResetPrefill) {
    navigateTo('resetPassword', normalizeResetPrefill(prefill));
  }

  function renderPage() {
    if (page === 'planner') {
      return (
        <RoutePlanner
          authUser={authUser}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          scrollToSection={scrollToSection}
          navigateTo={navigateTo}
          page={page}
        />
      );
    }

    if (page === 'profile') {
      if (!authUser) {
        return (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => navigateTo('register')}
            onSwitchToForgotPassword={openForgotPassword}
          />
        );
      }

      return <Profile user={authUser} onOpenPlanner={openPlanner} onLogout={handleLogout} />;
    }

    if (page === 'login') {
      return (
        <Login
          onLogin={handleLogin}
          onSwitchToRegister={() => navigateTo('register')}
          onSwitchToForgotPassword={openForgotPassword}
        />
      );
    }

    if (page === 'register') {
      return <Register onRegister={handleRegister} onSwitchToLogin={() => navigateTo('login')} />;
    }

    if (page === 'forgotPassword') {
      return (
        <ForgotPassword
          initialEmail={resetPrefill.email}
          onForgotPassword={handleForgotPassword}
          onSwitchToLogin={() => navigateTo('login')}
          onShowToast={showToast}
        />
      );
    }

    if (page === 'verifyCode') {
      return (
        <VerifyCode
          initialEmail={resetPrefill.email}
          initialCode={resetPrefill.code}
          onVerifyCode={handleVerifyCode}
          onResendCode={handleResendCode}
          onSwitchToLogin={() => navigateTo('login')}
          onSwitchToForgotPassword={() => openForgotPassword(resetPrefill.email)}
          onShowToast={showToast}
        />
      );
    }

    if (page === 'resetPassword') {
      return (
        <ResetPassword
          initialEmail={resetPrefill.email}
          initialToken={resetPrefill.token}
          onResetPassword={handleResetPassword}
          onSwitchToLogin={() => navigateTo('login')}
          onSwitchToForgotPassword={() => navigateTo('forgotPassword', resetPrefill)}
          onShowToast={showToast}
        />
      );
    }

    return (
      <Home
        authUser={authUser}
        onStart={openPlanner}
        onLogin={() => navigateTo('login')}
        onRegister={() => navigateTo('register')}
        onProfile={openProfile}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />
    );
  }

  return (
    <div className="app-shell">
<header className="app-header">
        <button 
          type="button" 
          className={`hamburger-menu ${mobileMenuOpen ? 'open' : ''}`} 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className="logo-container">
          <div className="logo-3d" onClick={() => navigateTo('home')} role="button" tabIndex={0}>
            <span className="brand-name">Goli</span>
            <span className="brand-name">Transit</span>
          </div>
        </div>

<nav className={`app-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-links">
            <button
              type="button"
              className={page === 'home' && activeSection !== 'about' && activeSection !== 'contact' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => { navigateTo('home'); setMobileMenuOpen(false); }}
            >
              Home
            </button>
            <button
              type="button"
              className={page === 'planner' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => { openPlanner(); setMobileMenuOpen(false); }}
            >
              Route Planner
            </button>
            <button
              type="button"
              className={page === 'home' && activeSection === 'about' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => { openHomeSection('about'); setMobileMenuOpen(false); }}
            >
              About
            </button>
            <button
              type="button"
              className={page === 'home' && activeSection === 'contact' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => { openHomeSection('contact'); setMobileMenuOpen(false); }}
            >
              Contact
            </button>
            {authUser ? (
              <button
                type="button"
                className={page === 'profile' ? 'nav-btn active' : 'nav-btn'}
                onClick={() => { openProfile(); setMobileMenuOpen(false); }}
              >
                Profile
              </button>
            ) : null}
          </div>

          <div className="nav-auth">
            {authUser ? (
              <>
                <div className="user-pill">
                  <span className="user-pill-label">Signed in as</span>
                  <strong>{authUser.name}</strong>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={page === 'login' ? 'nav-btn active' : 'nav-btn'}
                  onClick={() => { navigateTo('login'); setMobileMenuOpen(false); }}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={page === 'register' ? 'nav-btn nav-btn-cta active' : 'nav-btn nav-btn-cta'}
                  onClick={() => { navigateTo('register'); setMobileMenuOpen(false); }}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="page-content">
        {isRestoringSession ? (
          <section className="auth-loading fade-in">
            <Loader label="Restoring your session..." />
          </section>
        ) : (
          <>
            {toast ? (
              <div className={`app-toast app-toast-${toast.type || 'success'}`} role="status" aria-live="polite">
                <span>{toast.message}</span>
                <button type="button" className="app-toast-close" onClick={() => setToast(null)} aria-label="Dismiss notification">
                  ×
                </button>
              </div>
            ) : null}
            {renderPage()}
          </>
        )}
      </main>

      <footer className="special-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <div className="logo-3d" onClick={() => navigateTo('home')} role="button" tabIndex={0}>
              <span className="brand-name">Goli</span>
              <span className="brand-name">Transit</span>
            </div>
            <span>Smart Navigation for Dhaka</span>
          </div>

          <div className="footer-links footer-links-column">
            <h4>Navigation</h4>
            <a href="#home" onClick={(event) => { event.preventDefault(); navigateTo('home'); }}>
              Home
            </a>
            <a href="#about" onClick={(event) => { event.preventDefault(); openHomeSection('about'); }}>
              About
            </a>
            <a href="#contact" onClick={(event) => { event.preventDefault(); openHomeSection('contact'); }}>
              Contact
            </a>
            <a href="#planner" onClick={(event) => { event.preventDefault(); openPlanner(); }}>
              Planner
            </a>
          </div>

          <div className="footer-links footer-links-column">
            <h4>Account</h4>
            {authUser ? (
              <>
                <a href="#profile" onClick={(event) => { event.preventDefault(); openProfile(); }}>
                  Profile
                </a>
              </>
            ) : (
              <>
                <a href="#login" onClick={(event) => { event.preventDefault(); navigateTo('login'); }}>
                  Login
                </a>
                <a href="#register" onClick={(event) => { event.preventDefault(); navigateTo('register'); }}>
                  Register
                </a>
              </>
            )}
          </div>

          <div className="footer-contact">
            <div className="contact-block">
              <span className="label">Email</span>
              <a href="mailto:abcd@golitranist.com" className="value">
                abcd@golitranist.com
              </a>
            </div>
            <div className="contact-block">
              <span className="label">Phone</span>
              <a href="tel:+8801968776048" className="value">
                +880 196 877 6048
              </a>
            </div>
            <div className="contact-block">
              <span className="label">Office</span>
              <div className="value">Eastern Galaxy, Mohammadpur, Dhaka-1207</div>
            </div>
          </div>
        </div>

        <div className="footer-copy">
          © 2026 GoliTransit • Built for Dhaka&apos;s chaos • Powered by Three.js & Real-time Graphs
        </div>
      </footer>
    </div>
  );
}
