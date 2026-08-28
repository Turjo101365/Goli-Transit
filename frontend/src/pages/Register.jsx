import { useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

const TEXT = {
  bn: {
    title: 'নতুন অ্যাকাউন্ট', subtitle: 'রুট প্ল্যানার আর লাইভ ট্র্যাফিক দেখতে অ্যাকাউন্ট খুলুন।',
    name: 'নাম', email: 'ইমেইল', password: 'পাসওয়ার্ড', confirm: 'পাসওয়ার্ড আবার লিখুন',
    show: 'দেখাও', hide: 'লুকাও',
    submit: 'অ্যাকাউন্ট তৈরি করুন', submitting: 'তৈরি হচ্ছে…',
    mismatch: 'পাসওয়ার্ড মিলছে না।',
    haveAccount: 'অ্যাকাউন্ট আছে?', signIn: 'সাইন ইন'
  },
  en: {
    title: 'Create account', subtitle: 'Sign up to see your route planner and live traffic.',
    name: 'Full name', email: 'Email', password: 'Password', confirm: 'Confirm password',
    show: 'Show', hide: 'Hide',
    submit: 'Create Account', submitting: 'Creating account…',
    mismatch: 'Passwords do not match.',
    haveAccount: 'Already have an account?', signIn: 'Sign in'
  }
};

export function Register({ onRegister, onSwitchToLogin }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError(t.mismatch);
      return;
    }
    setError('');
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
          <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: 'var(--metro)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>
            {t.signIn}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField label={t.name}>
          <input type="text" name="name" value={form.name} onChange={handleChange} required style={authInputStyle} />
        </AuthField>

        <AuthField label={t.email}>
          <input type="email" name="email" value={form.email} onChange={handleChange} required style={authInputStyle} />
        </AuthField>

        <AuthField label={t.password}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword1 ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              style={{ ...authInputStyle, paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword1((v) => !v)}
              className="t-label"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--metro)', cursor: 'pointer' }}
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
              value={form.confirmPassword}
              onChange={handleChange}
              required
              style={{ ...authInputStyle, paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword2((v) => !v)}
              className="t-label"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--metro)', cursor: 'pointer' }}
            >
              {showPassword2 ? t.hide : t.show}
            </button>
          </div>
        </AuthField>

        {error ? <p className="t-body" style={{ color: 'var(--stamp)', marginBottom: 14 }}>{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="chip"
          style={{ width: '100%', padding: '11px 0', fontSize: 15, background: 'var(--cream)', color: 'var(--ground)' }}
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </form>
    </AuthShell>
  );
}
