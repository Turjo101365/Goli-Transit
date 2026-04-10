import { useState } from 'react';

export function ForgotPassword({ initialEmail = '', onForgotPassword, onOpenReset, onSwitchToLogin }) {
  const [email, setEmail] = useState(initialEmail);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await onForgotPassword({ email });
      setSuccess(result);
    } catch (requestError) {
      setError(requestError.message || 'Unable to start password reset.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-container about-section fade-in">
      <div className="login-card about-card feature-card card-3d hover-glow">

        <h2 className="section-title neon-glow" style={{textAlign: 'center', marginBottom: '0.5rem'}}>
          Forgot Password
        </h2>

        <p style={{color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '2rem'}}>
          Enter your email to receive a password reset code.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* EMAIL */}
          <div className="floating-group">
            <input
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder=" "
              required
            />
            <label>Email</label>
          </div>

          {/* ERROR */}
          {error && <p className="error-box">{error}</p>}

          {/* SUCCESS */}
          {success && (
            <div className="auth-success-card">
              <strong>{success.message}</strong>
              <p className="helper-text">Check your inbox and spam folder.</p>

              {success.resetToken && (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => onOpenReset({ email, token: success.resetToken })}
                >
                  Open Reset Password
                </button>
              )}
            </div>
          )}

          {/* BUTTON */}
          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Generating reset...' : 'Send Code'}
          </button>

          {/* BACK */}
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