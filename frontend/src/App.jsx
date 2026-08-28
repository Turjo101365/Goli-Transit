import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { FurutHero } from './components/FurutHero.jsx';
import { SideRail } from './components/SideRail.jsx';
import { FurutMap } from './components/FurutMap.jsx';
import { LiveJourney } from './components/LiveJourney.jsx';
import { GoliUI } from './components/GoliUI.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { VerifyCode } from './pages/VerifyCode.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { LanguageProvider, useLanguage } from './state/LanguageContext.jsx';
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

const NAV_LINKS = [
  { to: '/map', bn: 'মানচিত্র', en: 'Map' },
  { to: '/live', bn: 'লাইভ জার্নি', en: 'Live' },
  { to: '/belt', bn: 'জ্যাম বেল্ট', en: 'Belt' }
];

// The three screens have no other way to reach each other.
function ScreenNav({ onLogout }) {
  const { lang } = useLanguage();

  return (
    <nav className="screen-nav">
      <NavLink to="/" className="t-brand screen-nav-brand" style={{ color: 'var(--cream)', textDecoration: 'none' }}>
        ফুরুৎ
      </NavLink>
      <div className="screen-nav-links">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            lang={lang}
            className="screen-nav-link"
            style={({ isActive }) => ({
              color: 'var(--cream)',
              textDecoration: 'none',
              borderBottom: isActive ? '2px solid var(--stamp)' : '2px solid transparent',
              paddingBottom: 4
            })}
          >
            {lang === 'en' ? link.en : link.bn}
          </NavLink>
        ))}
      </div>
      <button type="button" onClick={onLogout} className="chip screen-nav-logout">
        {lang === 'en' ? 'Logout' : 'লগআউট'}
      </button>
    </nav>
  );
}

function RequireAuth({ authUser, children }) {
  const location = useLocation();

  if (!authUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function LoginRoute({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogin(credentials) {
    await onLogin(credentials);
    navigate(location.state?.from?.pathname || '/map', { replace: true });
  }

  return (
    <Login
      onLogin={handleLogin}
      onSwitchToRegister={() => navigate('/register')}
      onSwitchToForgotPassword={() => navigate('/forgot-password')}
    />
  );
}

function RegisterRoute({ onRegister }) {
  const navigate = useNavigate();

  async function handleRegister(payload) {
    await onRegister(payload);
    navigate('/map', { replace: true });
  }

  return <Register onRegister={handleRegister} onSwitchToLogin={() => navigate('/login')} />;
}

function AppRoutes({ authUser, onLogin, onRegister, onForgotPassword, onResendCode, onVerifyCode, onResetPassword, onLogout }) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute onLogin={onLogin} />} />
      <Route path="/register" element={<RegisterRoute onRegister={onRegister} />} />
      <Route
        path="/forgot-password"
        element={
          <ForgotPassword
            initialEmail=""
            onForgotPassword={onForgotPassword}
            onSwitchToLogin={() => navigate('/login')}
            onShowToast={() => {}}
          />
        }
      />
      <Route
        path="/verify-code"
        element={
          <VerifyCode
            initialEmail=""
            initialCode=""
            onVerifyCode={onVerifyCode}
            onResendCode={onResendCode}
            onSwitchToLogin={() => navigate('/login')}
            onSwitchToForgotPassword={() => navigate('/forgot-password')}
            onShowToast={() => {}}
          />
        }
      />
      <Route
        path="/reset-password"
        element={
          <ResetPassword
            initialEmail=""
            initialToken=""
            onResetPassword={onResetPassword}
            onSwitchToLogin={() => navigate('/login')}
            onSwitchToForgotPassword={() => navigate('/forgot-password')}
            onShowToast={() => {}}
          />
        }
      />

      <Route path="/" element={<FurutHero authUser={authUser} />} />
      <Route
        path="/map"
        element={
          <RequireAuth authUser={authUser}>
            <>
              <ScreenNav onLogout={onLogout} />
              <FurutMap />
            </>
          </RequireAuth>
        }
      />
      <Route
        path="/live"
        element={
          <RequireAuth authUser={authUser}>
            <>
              <ScreenNav onLogout={onLogout} />
              <LiveJourney />
            </>
          </RequireAuth>
        }
      />
      <Route
        path="/belt"
        element={
          <RequireAuth authUser={authUser}>
            <>
              <ScreenNav onLogout={onLogout} />
              <GoliUI />
            </>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const [authUser, setAuthUser] = useState(() => getCurrentUser());
  const [isRestoringSession, setIsRestoringSession] = useState(() => hasActiveSession());

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

    function handleUnauthorized() {
      setAuthUser(null);
    }

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  async function handleLogin(credentials) {
    const user = await loginUser(credentials);
    setAuthUser(user);
  }

  async function handleRegister(payload) {
    const user = await registerUser(payload);
    setAuthUser(user);
  }

  function handleLogout() {
    logoutUser();
    setAuthUser(null);
  }

  if (isRestoringSession) {
    return <p className="t-body" style={{ padding: 24, background: 'var(--ground)', color: 'var(--cream)', minHeight: '100vh', margin: 0 }}>…</p>;
  }

  return (
    <>
      <AppRoutes
        authUser={authUser}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onForgotPassword={sendResetCode}
        onResendCode={sendResetCode}
        onVerifyCode={verifyResetCode}
        onResetPassword={resetUserPassword}
        onLogout={handleLogout}
      />
      {/* Rendered after the routed screens: position:fixed content always
          paints above static in-flow content regardless of DOM order, but
          placing it last keeps that assumption from being load-bearing. */}
      <SideRail />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </BrowserRouter>
  );
}
