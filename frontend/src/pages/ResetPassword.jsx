import { useEffect, useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const initialForm = {
  email: '',
  resetToken: '',
  password: '',
  confirmPassword: ''
};

const TEXT = {
  bn: {
    title: 'নতুন পাসওয়ার্ড নির্ধারণ',
    subtitle: 'আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড লিখুন।',
    email: 'ইমেইল',
    emailVerified: 'ইমেইল যাচাই সম্পন্ন',
    password: 'নতুন পাসওয়ার্ড',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    show: 'দেখাও',
    hide: 'লুকাও',
    submit: 'পাসওয়ার্ড আপডেট করুন',
    submitting: 'আপডেট হচ্ছে…',
    mismatch: 'পাসওয়ার্ড মিলছে না।',
    minLength: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
    missingEmail: 'ইমেইল ঠিকানা প্রয়োজন।',
    missingToken: 'রিসেট সেশন পাওয়া যায়নি। আবার কোড যাচাই করুন।',
    needNewCode: 'নতুন কোড লাগবে?',
    sendAgain: 'আবার পাঠান',
    backToLogin: 'সাইন ইন করুন',
    remember: 'পাসওয়ার্ড মনে পড়েছে?',
    successMsg: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।'
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Choose a new secure password for your account.',
    email: 'Email',
    emailVerified: 'Email verified',
    password: 'New Password',
    confirmPassword: 'Confirm Password',
    show: 'Show',
    hide: 'Hide',
    submit: 'Update Password',
    submitting: 'Updating password…',
    mismatch: 'Passwords do not match.',
    minLength: 'Password must be at least 6 characters.',
    missingEmail: 'Email is required to reset the password.',
    missingToken: 'Your reset session is missing. Please verify the code again.',
    needNewCode: 'Need a new code?',
    sendAgain: 'Send again',
    backToLogin: 'Sign in',
    remember: 'Remember your password?',
    successMsg: 'Password updated successfully.'
  }
};

export function ResetPassword({
  initialEmail = '',
  initialToken = '',
  onResetPassword,
  onSwitchToLogin,
  onSwitchToForgotPassword,
  onShowToast
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.en;
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setForm((currentForm) => ({
      ...currentForm,
      email: initialEmail,
      resetToken: initialToken
    }));
  }, [initialEmail, initialToken]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      setError(t.missingEmail);
      onShowToast?.(t.missingEmail, 'error');
      return;
    }

    if (!form.resetToken) {
      setError(t.missingToken);
      onShowToast?.(t.missingToken, 'error');
      return;
    }

    if (form.password.length < 6) {
      setError(t.minLength);
      onShowToast?.(t.minLength, 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError(t.mismatch);
      onShowToast?.(t.mismatch, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await onResetPassword({
        email: cleanEmail,
        resetToken: form.resetToken,
        password: form.password
      });
      onShowToast?.(t.successMsg, 'success');
    } catch (requestError) {
      const message =
        requestError.message ||
        (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন করা যায়নি।' : 'Unable to reset password.');
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title={t.title}
      subtitle={t.subtitle}
      footer={
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p className="t-body" style={{ margin: '0 0 8px', color: 'var(--c70)' }}>
            {t.needNewCode}{' '}
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                font: 'inherit',
                textDecoration: 'underline'
              }}
            >
              {t.sendAgain}
            </button>
          </p>
          <p className="t-body" style={{ margin: 0, color: 'var(--c70)' }}>
            {t.remember}{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--metro)',
                cursor: 'pointer',
                font: 'inherit',
                textDecoration: 'underline'
              }}
            >
              {t.backToLogin}
            </button>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField label={t.email}>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              name="email"
              value={form.email}
              readOnly
              style={{
                ...authInputStyle,
                background: 'var(--c10)',
                color: 'var(--c70)',
                cursor: 'default',
                paddingRight: 100
              }}
            />
            <span
              className="t-label"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--metro)',
                fontSize: 11
              }}
            >
              ✓ {t.emailVerified}
            </span>
          </div>
        </AuthField>

        <AuthField label={t.password}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              style={{ ...authInputStyle, paddingRight: 56 }}
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

        <AuthField label={t.confirmPassword}>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              style={{ ...authInputStyle, paddingRight: 56 }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
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
              {showConfirmPassword ? t.hide : t.show}
            </button>
          </div>
        </AuthField>

        {error ? (
          <p className="t-body" style={{ color: 'var(--stamp)', marginBottom: 14 }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="chip"
          style={{
            width: '100%',
            padding: '11px 0',
            fontSize: 15,
            background: 'var(--cream)',
            color: 'var(--ground)',
            marginTop: 4
          }}
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </form>
    </AuthShell>
  );
}
