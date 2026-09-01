import { useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { GoogleSignInButton } from '../components/GoogleSignInButton.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const GOOGLE_LOGIN_AVAILABLE = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const TEXT = {
  bn: {
    title: 'নতুন অ্যাকাউন্ট',
    subtitle: 'রুট প্ল্যানার আর লাইভ ট্র্যাফিক দেখতে অ্যাকাউন্ট খুলুন।',
    name: 'পূর্ণ নাম',
    email: 'ইমেইল অ্যাড্রেস',
    password: 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)',
    confirm: 'পাসওয়ার্ড নিশ্চিত করুন',
    show: 'দেখাও',
    hide: 'লুকাও',
    submit: 'অ্যাকাউন্ট তৈরি করুন',
    submitting: 'অ্যাকাউন্ট তৈরি হচ্ছে…',
    mismatch: 'পাসওয়ার্ড দুটি মিলছে না।',
    shortPassword: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
    shortName: 'অনুগ্রহ করে আপনার পুরো নাম লিখুন (কমপক্ষে ২ অক্ষর)।',
    haveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?',
    signIn: 'সাইন ইন করুন',
    or: 'অথবা',
    guest: 'জরুরি হলে গেস্ট হিসেবে ঢুকুন',
    guestBusy: 'ঢোকা হচ্ছে…',
    guestNote: 'অ্যাকাউন্ট ছাড়াই ৬ ঘণ্টার জন্য — পরে চাইলে সেভ করা যাবে।',
    googleFailed: 'গুগল দিয়ে অ্যাকাউন্ট তৈরি করা যায়নি।'
  },
  en: {
    title: 'Create account',
    subtitle: 'Sign up to see your route planner and live traffic.',
    name: 'Full Name',
    email: 'Email Address',
    password: 'Password (min. 6 characters)',
    confirm: 'Confirm Password',
    show: 'Show',
    hide: 'Hide',
    submit: 'Create Account',
    submitting: 'Creating account…',
    mismatch: 'Passwords do not match.',
    shortPassword: 'Password must be at least 6 characters.',
    shortName: 'Please enter your full name (at least 2 characters).',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    or: 'or',
    guest: 'In a hurry? Continue as guest',
    guestBusy: 'Continuing…',
    guestNote: 'No account, 6-hour session — you can save it as a real account later.',
    googleFailed: 'Unable to sign up with Google.'
  }
};

export function Register({
  onRegister,
  onGuestLogin,
  onGoogleLogin,
  onSwitchToLogin
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuestSubmitting, setIsGuestSubmitting] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleGoogleCredential(credential) {
    setError('');
    try {
      await onGoogleLogin?.(credential);
    } catch (googleError) {
      setError(googleError.message || t.googleFailed);
    }
  }

  async function handleGuestLogin() {
    setError('');
    setIsGuestSubmitting(true);
    try {
      await onGuestLogin?.();
    } catch (guestError) {
      setError(guestError.message || 'Unable to start a guest session.');
    } finally {
      setIsGuestSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.name.trim().length < 2) {
      setError(t.shortName);
      return;
    }

    if (form.password.length < 6) {
      setError(t.shortPassword);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t.mismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      await onRegister(form);
    } catch (authError) {
      setError(authError.message || 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <p className="t-body" style={{ textAlign: 'center', marginTop: 16, color: 'var(--c70)' }}>
          {t.haveAccount}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--metro)',
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 700,
              textDecoration: 'underline'
            }}
          >
            {t.signIn}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField label={t.name}>
          <input
            type="text"
            name="name"
            placeholder={lang === 'bn' ? 'যেমন: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
            value={form.name}
            onChange={handleChange}
            required
            style={authInputStyle}
          />
        </AuthField>

        <AuthField label={t.email}>
          <input
            type="email"
            name="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={handleChange}
            required
            style={authInputStyle}
          />
        </AuthField>

        <AuthField label={t.password}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword1 ? 'text' : 'password'}
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              style={{ ...authInputStyle, paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword1((v) => !v)}
              className="t-label"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showPassword1 ? t.hide : t.show}
            </button>
          </div>
        </AuthField>

        <AuthField label={t.confirm}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword2 ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              style={{ ...authInputStyle, paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword2((v) => !v)}
              className="t-label"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {showPassword2 ? t.hide : t.show}
            </button>
          </div>
        </AuthField>

        {error ? (
          <p
            className="t-body"
            style={{
              color: 'var(--stamp)',
              background: 'rgba(199, 54, 43, 0.08)',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid rgba(199, 54, 43, 0.2)',
              marginBottom: 14,
              fontSize: 13,
              fontWeight: 500
            }}
          >
            ⚠️ {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="hero-btn-primary"
          style={{
            width: '100%',
            padding: '12px 0',
            fontSize: 15,
            justifyContent: 'center',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.8 : 1
          }}
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>

        {GOOGLE_LOGIN_AVAILABLE ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
              <div className="rule-hair" style={{ flex: 1 }} />
              <span className="t-label">{t.or}</span>
              <div className="rule-hair" style={{ flex: 1 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleSignInButton onCredential={handleGoogleCredential} />
            </div>
          </>
        ) : null}

        {onGuestLogin ? (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button
              type="button"
              disabled={isGuestSubmitting}
              onClick={handleGuestLogin}
              className="action-chip"
              style={{
                width: '100%',
                padding: '10px 0',
                justifyContent: 'center',
                borderColor: 'var(--stamp)',
                color: 'var(--stamp)',
                background: 'rgba(199, 54, 43, 0.04)',
                fontWeight: 600,
                fontSize: 13.5
              }}
            >
              {isGuestSubmitting ? t.guestBusy : t.guest}
            </button>
            <p className="t-label" style={{ color: 'var(--c45)', marginTop: 6, fontSize: 11 }}>
              {t.guestNote}
            </p>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}
