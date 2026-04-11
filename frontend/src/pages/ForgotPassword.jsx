import { useEffect, useState } from 'react';

export function ForgotPassword({ initialEmail = '', onForgotPassword, onSwitchToLogin, onShowToast }) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await onForgotPassword({ email });
    } catch (requestError) {
      const message = requestError.message || 'Unable to start password reset.';
      setError(message);
      onShowToast?.(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-container about-section fade-in">
      <div className="login-card about-card feature-card card-3d hover-glow">
        <h2 className="section-title neon-glow" style={{ fontSize: '1.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Forgot Password
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          Enter your email and we will send a 6-digit verification code.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="floating-group">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder=" "
              autoComplete="email"
              required
            />
            <label>Email</label>
          </div>

          {error ? <p className="error-box">{error}</p> : null}

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="loader-wrap">
                <span className="loader" />
                Sending code...
              </span>
            ) : (
              'Send Verification Code'
            )}
          </button>

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
