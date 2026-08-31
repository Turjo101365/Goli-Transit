import { useEffect, useState } from 'react';
import { AuthShell, AuthField, authInputStyle } from '../components/AuthShell.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const RESEND_COOLDOWN_SECONDS = 45;

const TEXT = {
  bn: {
    title: 'কোড যাচাইকরণ',
    subtitle: 'আপনার ইমেইলে পাঠানো ৬ সংখ্যার ভেরিফিকেশন কোডটি দিন।',
    email: 'ইমেইল',
    code: '৬ সংখ্যার ভেরিফিকেশন কোড',
    codePlaceholder: '• • • • • •',
    submit: 'কোড নিশ্চিত করুন',
    submitting: 'যাচাই করা হচ্ছে…',
    resend: 'নতুন কোড পাঠান',
    resending: 'কোড পাঠানো হচ্ছে…',
    resendCooldown: (seconds) => `${seconds} সেকেন্ড পর পুনরায় পাঠান`,
    wrongEmail: 'ভুল ইমেইল দিয়েছেন?',
    changeEmail: 'ইমেইল পরিবর্তন করুন',
    backToLogin: 'সাইন ইন করুন',
    remember: 'পাসওয়ার্ড মনে পড়েছে?',
    missingEmail: 'ইমেইল ঠিকানা দিন।',
    codeLengthError: 'ভেরিফিকেশন কোড অবশ্যই ৬ ডিজিটের হতে হবে।',
    resendSuccess: 'নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে।'
  },
  en: {
    title: 'Verify Code',
    subtitle: 'Enter the 6-digit verification code sent to your email.',
    email: 'Email',
    code: '6-Digit Verification Code',
    codePlaceholder: '• • • • • •',
    submit: 'Verify Code',
    submitting: 'Verifying code…',
    resend: 'Resend Code',
    resending: 'Sending…',
    resendCooldown: (seconds) => `Resend code in ${seconds}s`,
    wrongEmail: 'Wrong email address?',
    changeEmail: 'Change email',
    backToLogin: 'Sign in',
    remember: 'Remember your password?',
    missingEmail: 'Please enter the email address that received the code.',
    codeLengthError: 'Verification code must be 6 digits.',
    resendSuccess: 'A new verification code has been sent to your email.'
  }
};

function normalizeCode(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 6);
}

export function VerifyCode({
  initialEmail = '',
  initialCode = '',
  onVerifyCode,
  onResendCode,
  onSwitchToLogin,
  onSwitchToForgotPassword,
  onShowToast
}) {
  const { lang } = useLanguage();
  const t = TEXT[lang] || TEXT.en;
  const [form, setForm] = useState({
    email: initialEmail,
    code: initialCode
  });
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    setForm({
      email: initialEmail,
      code: initialCode
    });
  }, [initialEmail, initialCode]);

  useEffect(() => {
    if (!resendSecondsLeft) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendSecondsLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSecondsLeft]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'code' ? normalizeCode(value) : value
    }));
  }

  async function handleVerify(event) {
    event.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      setError(t.missingEmail);
      onShowToast?.(t.missingEmail, 'error');
      return;
    }

    if (form.code.length !== 6) {
      setError(t.codeLengthError);
      onShowToast?.(t.codeLengthError, 'error');
      return;
    }

    setIsVerifying(true);

    try {
      await onVerifyCode({
        email: cleanEmail,
        code: form.code
      });
    } catch (requestError) {
      const message =
        requestError.message ||
        (lang === 'bn' ? 'কোড যাচাই করা যায়নি।' : 'Unable to verify the code.');
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError('');
    setInfoMessage('');

    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      setError(t.missingEmail);
      onShowToast?.(t.missingEmail, 'error');
      return;
    }

    setIsResending(true);

    try {
      await onResendCode({ email: cleanEmail });
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setForm((currentForm) => ({
        ...currentForm,
        code: ''
      }));
      setInfoMessage(t.resendSuccess);
      onShowToast?.(t.resendSuccess, 'success');
    } catch (requestError) {
      const message =
        requestError.message ||
        (lang === 'bn' ? 'নতুন কোড পাঠানো যায়নি।' : 'Unable to resend code.');
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsResending(false);
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
            {t.backToLogin}
          </button>
        </p>
      }
    >
      <form onSubmit={handleVerify}>
        <AuthField label={t.email}>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@example.com"
              autoComplete="email"
              required
              style={{ ...authInputStyle, paddingRight: onSwitchToForgotPassword ? 75 : 12 }}
            />
            {onSwitchToForgotPassword ? (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
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
                {t.changeEmail}
              </button>
            ) : null}
          </div>
        </AuthField>

        <AuthField label={t.code}>
          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder={t.codePlaceholder}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            style={{
              ...authInputStyle,
              textAlign: 'center',
              letterSpacing: '8px',
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'var(--data)'
            }}
          />
        </AuthField>

        {infoMessage ? (
          <p className="t-body" style={{ color: 'var(--metro)', marginBottom: 14 }}>
            {infoMessage}
          </p>
        ) : null}

        {error ? (
          <p className="t-body" style={{ color: 'var(--stamp)', marginBottom: 14 }}>
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isVerifying}
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
          {isVerifying ? t.submitting : t.submit}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
          <div className="rule-hair" style={{ flex: 1 }} />
        </div>

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || resendSecondsLeft > 0}
          className="chip"
          style={{
            width: '100%',
            padding: '10px 0',
            fontSize: 14,
            borderColor: 'var(--line)',
            color: resendSecondsLeft > 0 ? 'var(--c45)' : 'var(--cream)',
            background: 'var(--ground2)',
            cursor: resendSecondsLeft > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {isResending
            ? t.resending
            : resendSecondsLeft > 0
              ? t.resendCooldown(resendSecondsLeft)
              : t.resend}
        </button>
      </form>
    </AuthShell>
  );
}
