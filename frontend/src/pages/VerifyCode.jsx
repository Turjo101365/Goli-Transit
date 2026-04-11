import { useEffect, useState } from 'react';

const RESEND_COOLDOWN_SECONDS = 45;

const initialForm = {
  email: '',
  code: ''
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
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
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

    if (!form.email) {
      const message = 'Enter the email address that received the code.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    if (form.code.length !== 6) {
      const message = 'Verification code must be 6 digits.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    setIsVerifying(true);

    try {
      await onVerifyCode({
        email: form.email,
        code: form.code
      });
    } catch (requestError) {
      const message = requestError.message || 'Unable to verify the code.';
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError('');

    if (!form.email) {
      const message = 'Enter your email address before requesting a new code.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    setIsResending(true);

    try {
      await onResendCode({ email: form.email });
      setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setForm((currentForm) => ({
        ...currentForm,
        code: ''
      }));
    } catch (requestError) {
      const message = requestError.message || 'Unable to resend the code.';
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsResending(false);
    }
  }

  return (
    <section className="login-container about-section fade-in">
      <div className="login-card about-card feature-card card-3d hover-glow">
        <h2 className="section-title neon-glow" style={{ fontSize: '1.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Verify Code
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          Enter the 6-digit verification code sent to your email.
        </p>

        <form className="auth-form" onSubmit={handleVerify}>
          <div className="floating-group">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder=" "
              autoComplete="email"
              required
            />
            <label>Email</label>
          </div>

          <div className="floating-group">
            <input
              type="text"
              name="code"
              value={form.code}
              onChange={handleChange}
              placeholder=" "
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
            <label>Verification Code</label>
          </div>

          {error ? <p className="error-box">{error}</p> : null}

          <button type="submit" className="primary-btn auth-submit" disabled={isVerifying}>
            {isVerifying ? (
              <span className="loader-wrap">
                <span className="loader" />
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </button>

          <button
            type="button"
            className="secondary-btn auth-wide-btn"
            onClick={handleResend}
            disabled={isResending || resendSecondsLeft > 0}
          >
            {isResending
              ? 'Sending...'
              : resendSecondsLeft > 0
                ? `Resend in ${resendSecondsLeft}s`
                : 'Resend Code'}
          </button>

          <p className="auth-switch">
            Wrong email?{' '}
            <button type="button" className="text-btn" onClick={onSwitchToForgotPassword}>
              Go back
            </button>
          </p>

          <p className="auth-switch">
            Back to login?{' '}
            <button type="button" className="text-btn" onClick={onSwitchToLogin}>
              Login here
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
