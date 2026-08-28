import { useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const initialForm = {
  email: '',
  password: ''
};

const TEXT = {
  bn: {
    title: 'ফিরে স্বাগতম', subtitle: 'রুট প্ল্যানার আর লাইভ ট্র্যাফিক দেখতে সাইন ইন করুন।',
    email: 'ইমেইল', password: 'পাসওয়ার্ড', show: 'দেখাও', hide: 'লুকাও',
    submit: 'সাইন ইন', submitting: 'সাইন ইন হচ্ছে…',
    noAccount: 'অ্যাকাউন্ট নেই?', create: 'নতুন করুন', forgot: 'পাসওয়ার্ড ভুলে গেছেন?'
  },
  en: {
    title: 'Welcome back', subtitle: 'Sign in to see your route planner and live traffic.',
    email: 'Email', password: 'Password', show: 'Show', hide: 'Hide',
    submit: 'Sign In', submitting: 'Signing in…',
    noAccount: "Don't have an account?", create: 'Create one', forgot: 'Forgot password?'
  }
};

export function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onLogin(form);
    } catch (authError) {
      setError(authError.message || 'Unable to log in.');
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
          {t.noAccount}{' '}
          <button type="button" onClick={onSwitchToRegister} style={{ background: 'none', border: 'none', color: 'var(--metro)', cursor: 'pointer', font: 'inherit', textDecoration: 'underline' }}>
            {t.create}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField label={t.email}>
          <input type="email" name="email" value={form.email} onChange={handleChange} required style={authInputStyle} />
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
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="t-label"
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--metro)', cursor: 'pointer' }}
            >
              {showPassword ? t.hide : t.show}
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

        <p style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" onClick={onSwitchToForgotPassword} className="t-label" style={{ background: 'none', border: 'none', color: 'var(--c45)', cursor: 'pointer' }}>
            {t.forgot}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
