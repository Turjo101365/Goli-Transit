import { useState, useEffect } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { GoogleSignInButton } from '../components/GoogleSignInButton.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const initialForm = {
  email: '',
  password: ''
};

const GOOGLE_LOGIN_AVAILABLE = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const TEXT = {
  bn: {
    userTitle: 'স্বাগতম',
    userSubtitle: 'রুট প্ল্যানার আর লাইভ ট্র্যাফিক দেখতে সাইন ইন করুন।',
    adminTitle: 'অ্যাডমিন পোর্টাল',
    adminSubtitle: 'সিস্টেম কন্ট্রোল ও ট্রানজিট অপারেশনের জন্য অ্যাডমিন আইডি দিয়ে সাইন ইন করুন।',
    tabUser: '👤 যাত্রী সাইন ইন',
    tabAdmin: '🛡️ অ্যাডমিন পোর্টাল',
    email: 'ইমেইল',
    password: 'পাসওয়ার্ড',
    show: 'দেখাও',
    hide: 'লুকাও',
    submitUser: 'সাইন ইন করুন',
    submitAdmin: '🛡️ অ্যাডমিন হিসেবে সাইন ইন',
    submitting: 'সাইন ইন হচ্ছে…',
    noAccount: 'অ্যাকাউন্ট নেই?',
    create: 'নতুন করুন',
    forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
    or: 'অথবা',
    guest: 'জরুরি হলে গেস্ট হিসেবে ঢুকুন',
    guestBusy: 'ঢোকা হচ্ছে…',
    guestNote: 'অ্যাকাউন্ট ছাড়াই ৬ ঘণ্টার জন্য — পরে চাইলে সেভ করা যাবে।',
    googleFailed: 'গুগল দিয়ে সাইন ইন করা যায়নি।',
    adminNotice: '⚠️ এই পোর্টালটি শুধুমাত্র ঢাকা ট্রানজিট অনুমোদিত অ্যাডমিন ও মডারেটরদের জন্য সংরক্ষিত।',
    invalidCredentials: 'ভুল ইমেইল বা পাসওয়ার্ড। অনুগ্রহ করে পুনরায় চেষ্টা করুন বা পাসওয়ার্ড রিসেট করুন।'
  },
  en: {
    userTitle: 'Welcome back',
    userSubtitle: 'Sign in to see your route planner and live traffic.',
    adminTitle: 'Admin Portal',
    adminSubtitle: 'Sign in with administrator credentials for transit operations.',
    tabUser: '👤 Commuter Sign In',
    tabAdmin: '🛡️ Admin Portal',
    email: 'Email',
    password: 'Password',
    show: 'Show',
    hide: 'Hide',
    submitUser: 'Sign In',
    submitAdmin: '🛡️ Sign in as Admin',
    submitting: 'Signing in…',
    noAccount: "Don't have an account?",
    create: 'Create one',
    forgot: 'Forgot password?',
    or: 'or',
    guest: 'In a hurry? Continue as guest',
    guestBusy: 'Continuing…',
    guestNote: 'No account, 6-hour session — you can save it as a real account later.',
    googleFailed: 'Unable to sign in with Google.',
    adminNotice: '⚠️ This portal is strictly restricted to authorized transit system administrators.',
    invalidCredentials: 'Invalid email or password. Please try again or reset your password.'
  }
};

export function Login({
  initialEmail = '',
  initialMode = 'user',
  onLogin,
  onGuestLogin,
  onGoogleLogin,
  onSwitchToRegister,
  onSwitchToForgotPassword
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [loginMode, setLoginMode] = useState(initialMode);
  const [form, setForm] = useState(() => ({
    email: initialEmail,
    password: ''
  }));
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setLoginMode(initialMode);
  }, [initialMode]);

  async function handleGoogleCredential(credential) {
    setError('');
    setErrorCode('');

    try {
      await onGoogleLogin(credential);
    } catch (googleError) {
      setError(t.invalidCredentials);
    }
  }

  async function handleGuestLogin() {
    setError('');
    setErrorCode('');
    setIsGuestSubmitting(true);

    try {
      await onGuestLogin();
    } catch (guestError) {
      setError(guestError.message || 'Unable to start a guest session.');
    } finally {
      setIsGuestSubmitting(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setErrorCode('');
    setIsSubmitting(true);

    try {
      await onLogin({
        email: form.email,
        password: form.password,
        mode: loginMode
      });
    } catch (authError) {
      const code = authError.code || '';
      if (code === 'AUTH_ACCOUNT_SUSPENDED') {
        setError(authError.message);
      } else {
        setError(t.invalidCredentials);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAdminMode = loginMode === 'admin';

  return (
    <AuthShell
      title={isAdminMode ? t.adminTitle : t.userTitle}
      subtitle={isAdminMode ? t.adminSubtitle : t.userSubtitle}
      footer={
        !isAdminMode ? (
          <p className="t-body" style={{ textAlign: 'center', marginTop: 16, color: 'var(--c70)' }}>
            {t.noAccount}{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                font: 'inherit',
                textDecoration: 'underline',
                fontWeight: 600
              }}
            >
              {t.create}
            </button>
          </p>
        ) : (
          <p className="t-body" style={{ textAlign: 'center', marginTop: 16, color: 'var(--c70)' }}>
            <button
              type="button"
              onClick={() => {
                setLoginMode('user');
                setError('');
                setErrorCode('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                font: 'inherit',
                textDecoration: 'underline',
                fontWeight: 600
              }}
            >
              ← {lang === 'bn' ? 'সাধারণ যাত্রী লগইনে ফিরে যান' : 'Back to Commuter Sign In'}
            </button>
          </p>
        )
      }
    >
      {/* Role / Portal Switcher Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'var(--card-mid)',
          padding: 4,
          borderRadius: 10,
          marginBottom: 18,
          border: '1px solid var(--line)'
        }}
      >
        <button
          type="button"
          onClick={() => {
            setLoginMode('user');
            setError('');
            setErrorCode('');
          }}
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: !isAdminMode ? 'var(--cream)' : 'transparent',
            color: !isAdminMode ? 'var(--ground)' : 'var(--c70)',
            transition: 'all 0.15s ease'
          }}
        >
          {t.tabUser}
        </button>

        <button
          type="button"
          onClick={() => {
            setLoginMode('admin');
            setError('');
            setErrorCode('');
          }}
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            background: isAdminMode ? 'var(--metro)' : 'transparent',
            color: isAdminMode ? '#ffffff' : 'var(--c70)',
            transition: 'all 0.15s ease'
          }}
        >
          {t.tabAdmin}
        </button>
      </div>

      {isAdminMode && (
        <div
          style={{
            background: 'rgba(0, 106, 78, 0.12)',
            border: '1px solid var(--metro)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 16,
            fontSize: 12.5,
            color: 'var(--cream)',
            lineHeight: 1.4
          }}
        >
          {t.adminNotice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <AuthField label={t.email}>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder={isAdminMode ? 'admin@ezzgo.com' : 'user@example.com'}
            style={authInputStyle}
          />
        </AuthField>

        <AuthField label={t.password}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              style={{ ...authInputStyle, paddingRight: 56 }}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="t-label"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer'
              }}
            >
              {showPassword ? t.hide : t.show}
            </button>
          </div>
        </AuthField>

        {error ? (
          <div
            style={{
              background: 'rgba(186, 12, 47, 0.12)',
              border: '1px solid var(--stamp)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 13,
              color: 'var(--stamp)',
              lineHeight: 1.4
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="chip"
          style={{
            width: '100%',
            padding: '11px 0',
            fontSize: 15,
            fontWeight: 700,
            background: isAdminMode ? 'var(--metro)' : 'var(--cream)',
            color: isAdminMode ? '#ffffff' : 'var(--ground)',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {isSubmitting ? t.submitting : (isAdminMode ? t.submitAdmin : t.submitUser)}
        </button>

        {!isAdminMode && (
          <>
            {GOOGLE_LOGIN_AVAILABLE ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
                  <div className="rule-hair" style={{ flex: 1 }} />
                  <span className="t-label">{t.or}</span>
                  <div className="rule-hair" style={{ flex: 1 }} />
                </div>
                <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
              </>
            ) : null}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div className="rule-hair" style={{ flex: 1 }} />
              <span className="t-label">{t.or}</span>
              <div className="rule-hair" style={{ flex: 1 }} />
            </div>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isGuestSubmitting}
              className="chip"
              style={{ width: '100%', padding: '11px 0', fontSize: 15, borderColor: 'var(--stamp)', color: 'var(--stamp)' }}
            >
              {isGuestSubmitting ? t.guestBusy : t.guest}
            </button>
            <p className="t-label" style={{ textAlign: 'center', marginTop: 6, letterSpacing: 'normal' }} lang={lang}>
              {t.guestNote}
            </p>
          </>
        )}

        {!isAdminMode && (
          <p style={{ textAlign: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="t-label"
              style={{ background: 'none', border: 'none', color: 'var(--c45)', cursor: 'pointer' }}
            >
              {t.forgot}
            </button>
          </p>
        )}
      </form>
    </AuthShell>
  );
}

