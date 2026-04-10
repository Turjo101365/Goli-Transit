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
    <section className="auth-page fade-in">
      <article className="auth-panel auth-panel-feature">
        <span className="auth-kicker">Recover access</span>
        <h2>Forgot your password?</h2>
        <p>
          Enter your email and we will send a password reset link through email using the configured
          SMTP mailer.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature-item">
            <strong>Email delivery</strong>
            <span>The reset link is delivered to your inbox through nodemailer.</span>
          </div>
          <div className="auth-feature-item">
            <strong>Short expiry</strong>
            <span>Reset tokens expire automatically, so old links cannot be reused forever.</span>
          </div>
        </div>
      </article>

      <form className="auth-panel auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-copy">
          <span className="auth-kicker">Password recovery</span>
          <h2>Forgot Password</h2>
          <p>Use your registered email to generate a reset link.</p>
        </div>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        {success ? (
          <div className="auth-success-card">
            <strong>{success.message}</strong>
            <p className="helper-text">Check your inbox and spam folder for the password reset email.</p>
            {success.resetToken ? <code className="auth-code-block">{success.resetToken}</code> : null}
            {success.resetLink ? <p className="helper-text">{success.resetLink}</p> : null}
            {success.resetToken ? (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onOpenReset({ email, token: success.resetToken })}
              >
                Open Reset Password
              </button>
            ) : null}
          </div>
        ) : null}

        <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Generating reset...' : 'Send Reset Link'}
        </button>

        <p className="auth-switch">
          Back to login?
          <button type="button" className="text-btn" onClick={onSwitchToLogin}>
            Login here
          </button>
        </p>
      </form>
    </section>
  );
}
