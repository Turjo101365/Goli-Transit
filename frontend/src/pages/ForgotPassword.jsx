import { useEffect, useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const TEXT = {
  bn: {
    title: 'পাসওয়ার্ড ভুলে গেছেন?',
    subtitle: 'আপনার ইমেইল দিন, আমরা একটি ৬ সংখ্যার ভেরিফিকেশন কোড পাঠাবো।',
    email: 'ইমেইল',
    emailPlaceholder: 'name@example.com',
    submit: 'ভেরিফিকেশন কোড পাঠান',
    submitting: 'কোড পাঠানো হচ্ছে…',
    remember: 'পাসওয়ার্ড মনে পড়েছে?',
    signIn: 'সাইন ইন করুন',
    successMsg: 'ভেরিফিকেশন কোড পাঠানো হয়েছে।'
  },
  en: {
    title: 'Forgot Password?',
    subtitle: 'Enter your email address and we will send a 6-digit verification code.',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    submit: 'Send Verification Code',
    submitting: 'Sending code…',
    remember: 'Remember your password?',
    signIn: 'Sign in',
    successMsg: 'Verification code sent.'
  }
};

export function ForgotPassword({
  initialEmail = '',
  onForgotPassword,
  onSwitchToLogin,
  onSwitchToVerify,
  onShowToast
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.en;
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onForgotPassword({ email: cleanEmail });
      onShowToast?.(t.successMsg, 'success');
      onSwitchToVerify?.(cleanEmail);
    } catch (requestError) {
      const message =
        requestError.message ||
        (lang === 'bn' ? 'কোড পাঠানো যায়নি।' : 'Unable to send verification code.');
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
        <p className="t-body" style={{ textAlign: 'center', marginTop: 16, color: 'var(--c70)' }}>
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
            {t.signIn}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthField label={t.email}>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            required
            style={authInputStyle}
          />
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
