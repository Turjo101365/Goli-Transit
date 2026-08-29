import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { EzzGoHero } from './components/EzzGoHero.jsx';
import { EzzGoMap } from './components/EzzGoMap.jsx';
import { LiveJourney } from './components/LiveJourney.jsx';
import { EzzGoBelt } from './components/EzzGoBelt.jsx';
import { Layout } from './components/Layout.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ForgotPassword } from './pages/ForgotPassword.jsx';
import { VerifyCode } from './pages/VerifyCode.jsx';
import { ResetPassword } from './pages/ResetPassword.jsx';
import { LanguageProvider } from './state/LanguageContext.jsx';
import { ThemeProvider } from './state/ThemeContext.jsx';
import { TripProvider } from './state/TripContext.jsx';
import {
  hasActiveSession,
  getCurrentUser,
  loginAsGuest,
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerUser,
  resetUserPassword,
  sendResetCode,
  verifyResetCode,
  restoreSession
} from './services/auth.service.js';
import { AUTH_UNAUTHORIZED_EVENT } from './services/auth.storage.js';

function RequireAuth({ authUser, children }) {
  const location = useLocation();

  if (!authUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function LoginRoute({ onLogin, onGuestLogin, onGoogleLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogin(credentials) {
    await onLogin(credentials);
    navigate(location.state?.from?.pathname || '/map', { replace: true });
  }

  async function handleGuestLogin() {
    await onGuestLogin();
    navigate(location.state?.from?.pathname || '/map', { replace: true });
  }

  async function handleGoogleLogin(credential) {
    await onGoogleLogin(credential);
    navigate(location.state?.from?.pathname || '/map', { replace: true });
  }

  return (
    <Login
      onLogin={handleLogin}
      onGuestLogin={handleGuestLogin}
      onGoogleLogin={handleGoogleLogin}
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

function AppRoutes({
  authUser,
  onLogin,
  onGuestLogin,
  onGoogleLogin,
  onRegister,
  onForgotPassword,
  onResendCode,
  onVerifyCode,
  onResetPassword,
  onLogout
}) {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute onLogin={onLogin} onGuestLogin={onGuestLogin} onGoogleLogin={onGoogleLogin} />} />
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

      <Route
        path="/"
        element={
          <EzzGoHero
            authUser={authUser}
            onGuestLogin={async () => {
              await onGuestLogin();
              navigate('/map', { replace: true });
            }}
          />
        }
      />
      <Route
        path="/map"
        element={
          <RequireAuth authUser={authUser}>
            <EzzGoMap />
          </RequireAuth>
        }
      />
      <Route
        path="/live"
        element={
          <RequireAuth authUser={authUser}>
            <LiveJourney />
          </RequireAuth>
        }
      />
      <Route
        path="/belt"
        element={
          <RequireAuth authUser={authUser}>
            <EzzGoBelt />
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

  async function handleGuestLogin() {
    const user = await loginAsGuest();
    setAuthUser(user);
  }

  async function handleGoogleLogin(credential) {
    const user = await loginWithGoogle(credential);
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
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--ground)',
          color: 'var(--c45)',
          fontFamily: 'var(--data)',
          fontSize: 16
        }}
      >
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Layout authUser={authUser} onLogout={handleLogout}>
      <AppRoutes
        authUser={authUser}
        onLogin={handleLogin}
        onGuestLogin={handleGuestLogin}
        onGoogleLogin={handleGoogleLogin}
        onRegister={handleRegister}
        onForgotPassword={sendResetCode}
        onResendCode={sendResetCode}
        onVerifyCode={verifyResetCode}
        onResetPassword={resetUserPassword}
        onLogout={handleLogout}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <TripProvider>
            <AppShell />
          </TripProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
