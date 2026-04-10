import { useEffect, useState } from 'react';

export function ResetPassword({
  initialEmail = '',
  initialToken = '',
  onResetPassword,
  onSwitchToLogin,
  onSwitchToForgotPassword
}) {
  const [form, setForm] = useState({
    email: initialEmail,
    token: initialToken,
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm((currentForm) => ({
      ...currentForm,
      email: initialEmail,
      token: initialToken
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
    setIsSubmitting(true);

    try {
      await onResetPassword(form);
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page fade-in">
      <article className="auth-panel auth-panel-feature register-feature">
        <span className="auth-kicker">Set a new password</span>
        <h2>Reset Password</h2>
        <p>
          Paste the reset token you received from the forgot-password flow and choose a fresh
          password for your account.
        </p>
        <div className="auth-stat-grid">
          <div className="auth-stat-card">
            <strong>Token required</strong>
            <span>Only active reset tokens linked to your email can update the account password.</span>
          </div>
          <div className="auth-stat-card">
            <strong>Auto sign-in</strong>
            <span>You are logged in immediately after a successful password reset.</span>
          </div>
        </div>
      </article>

      <form className="auth-panel auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-copy">
          <span className="auth-kicker">Secure recovery</span>
          <h2>Reset Password</h2>
          <p>Enter the reset token and your new password.</p>
        </div>

        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Reset Token
          <input
            type="text"
            name="token"
            value={form.token}
            onChange={handleChange}
            placeholder="Paste your reset token"
            required
          />
        </label>

        <label>
          New Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
            required
          />
        </label>

        <label>
          Confirm Password
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting password...' : 'Reset Password'}
        </button>

        <p className="auth-switch">
          Need a new reset token?
          <button type="button" className="text-btn" onClick={onSwitchToForgotPassword}>
            Forgot password
          </button>
        </p>

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
