import { useEffect, useState } from 'react';

const initialForm = {
  email: '',
  resetToken: '',
  password: '',
  confirmPassword: ''
};

export function ResetPassword({
  initialEmail = '',
  initialToken = '',
  onResetPassword,
  onSwitchToLogin,
  onSwitchToForgotPassword,
  onShowToast
}) {
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

    if (!form.email) {
      const message = 'Email is required to reset the password.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    if (!form.resetToken) {
      const message = 'Your reset session is missing. Please verify the code again.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    if (form.password.length < 6) {
      const message = 'Password must be at least 6 characters.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      const message = 'Passwords do not match.';
      setError(message);
      onShowToast?.(message, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await onResetPassword(form);
    } catch (requestError) {
      const message = requestError.message || 'Unable to reset password.';
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
          Reset Password
        </h2>

        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          Choose a new password for your account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="floating-group">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder=" "
              autoComplete="email"
              readOnly
              required
            />
            <label>Email</label>
          </div>

          <p className="helper-text" style={{ marginTop: '-0.5rem', marginBottom: '0.5rem', textAlign: 'left' }}>
            Your verification code has already been confirmed. Create a new password below.
          </p>

          <div className="floating-group" style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder=" "
              autoComplete="new-password"
              required
            />
            <label>New Password</label>
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#00d4aa',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="floating-group" style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder=" "
              autoComplete="new-password"
              required
            />
            <label>Confirm Password</label>
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#00d4aa',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? <p className="error-box">{error}</p> : null}

          <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="loader-wrap">
                <span className="loader" />
                Updating password...
              </span>
            ) : (
              'Update Password'
            )}
          </button>

          <p className="auth-switch">
            Need a new code?{' '}
            <button type="button" className="text-btn" onClick={onSwitchToForgotPassword}>
              Send again
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
