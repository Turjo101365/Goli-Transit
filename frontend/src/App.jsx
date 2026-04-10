import { useEffect, useState } from 'react';
import { Home } from './pages/Home.jsx';
import { RoutePlanner } from './pages/RoutePlanner.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { Profile } from './pages/Profile.jsx';
import { Loader } from './components/UI/Loader.jsx';
import {
  hasActiveSession,
  getCurrentUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  registerUser,
  resetUserPassword,
  restoreSession
} from './services/auth.service.js';
import { AUTH_UNAUTHORIZED_EVENT } from './services/auth.storage.js';

const emptyResetPrefill = {
  email: '',
  token: ''
};

const pageQueryParamMap = {
  home: '',
  planner: 'planner',
  login: 'login',
  register: 'register',
  forgotPassword: 'forgot-password',
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
    token: params.get('token') || ''
  };
}

function getInitialPage() {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const page = new URLSearchParams(window.location.search).get('page');
  return pageByQueryParam[page] || 'home';
}

export default function App() {
  const [page, setPage] = useState(() => getInitialPage());
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [isRestoringSession, setIsRestoringSession] = useState(() => hasActiveSession());
  const [resetPrefill, setResetPrefill] = useState(() => getInitialResetPrefill());

  function syncPageToUrl(nextPage, nextResetPrefill = emptyResetPrefill, replace = false) {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const pageQueryValue = pageQueryParamMap[nextPage] || '';
    const normalizedResetPrefill = normalizeResetPrefill(nextResetPrefill);

    if (pageQueryValue) {
      url.searchParams.set('page', pageQueryValue);
    } else {
      url.searchParams.delete('page');
    }

    if (nextPage === 'forgotPassword' || nextPage === 'resetPassword') {
      if (normalizedResetPrefill.email) {
        url.searchParams.set('email', normalizedResetPrefill.email);
      } else {
        url.searchParams.delete('email');
      }
    } else {
      url.searchParams.delete('email');
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

    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function navigateTo(nextPage, nextResetPrefill = emptyResetPrefill, options = {}) {
    const normalizedResetPrefill = normalizeResetPrefill(nextResetPrefill);
    setPage(nextPage);
    setResetPrefill(normalizedResetPrefill);
    syncPageToUrl(nextPage, normalizedResetPrefill, options.replace === true);
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
    }

    function handleUnauthorized() {
      setAuthUser(null);
      navigateTo('login', emptyResetPrefill, { replace: true });
    }

    window.addEventListener('popstate', syncStateFromUrl);
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('popstate', syncStateFromUrl);
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  async function handleLogin(credentials) {
    const user = await loginUser(credentials);
    setAuthUser(user);
    navigateTo('profile');
  }

  async function handleRegister(payload) {
    const user = await registerUser(payload);
    setAuthUser(user);
    navigateTo('profile');
  }

  async function handleForgotPassword(payload) {
    return requestPasswordReset(payload);
  }

  async function handleResetPassword(payload) {
    const user = await resetUserPassword(payload);
    setAuthUser(user);
    navigateTo('profile');
  }

  function handleLogout() {
    logoutUser();
    setAuthUser(null);
    navigateTo('home');
  }

  function openPlanner() {
    navigateTo(authUser ? 'planner' : 'login');
  }

  function openProfile() {
    navigateTo(authUser ? 'profile' : 'login');
  }

  function openForgotPassword(email = '') {
    navigateTo('forgotPassword', {
      email,
      token: ''
    });
  }

  function openResetPassword(prefill = emptyResetPrefill) {
    navigateTo('resetPassword', normalizeResetPrefill(prefill));
  }

  function renderPage() {
    if (page === 'planner') {
      if (!authUser) {
        return (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => navigateTo('register')}
            onSwitchToForgotPassword={openForgotPassword}
          />
        );
      }

      return <RoutePlanner />;
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
          onOpenReset={openResetPassword}
          onSwitchToLogin={() => navigateTo('login')}
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
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>GoliTransit</h1>
          <p>Multi-Modal Hyper-Local Routing Engine</p>
        </div>
        <nav className="app-nav">
          <div className="nav-links">
            <button
              type="button"
              className={page === 'home' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => navigateTo('home')}
            >
              Home
            </button>
            <button
              type="button"
              className={page === 'planner' ? 'nav-btn active' : 'nav-btn'}
              onClick={openPlanner}
            >
              Route Planner
            </button>
            {authUser ? (
              <button
                type="button"
                className={page === 'profile' ? 'nav-btn active' : 'nav-btn'}
                onClick={openProfile}
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
                <button type="button" className="nav-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={page === 'login' ? 'nav-btn active' : 'nav-btn'}
                  onClick={() => navigateTo('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={page === 'register' ? 'nav-btn nav-btn-cta active' : 'nav-btn nav-btn-cta'}
                  onClick={() => navigateTo('register')}
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
          renderPage()
        )}
      </main>
    </div>
  );
}
