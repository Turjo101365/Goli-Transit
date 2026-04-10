import { useState } from 'react';

const initialForm = {
  email: '',
  password: ''
};

export function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await onLogin(form);
    } catch (authError) {
      setError(authError.message || 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page fade-in">
      <article className="auth-panel auth-panel-feature">
        <span className="auth-kicker">Return to your commute</span>
        <h2>Login and jump back into route planning.</h2>
        <p>
          Sign in with your saved account from GoliTransitDB and move straight to the planner.
        </p>
        <div className="auth-feature-list">
          <div className="auth-feature-item">
            <strong>Persistent account</strong>
            <span>Your profile is checked against the backend users table every time you sign in.</span>
          </div>
          <div className="auth-feature-item">
            <strong>Protected APIs</strong>
            <span>Planner requests now use your bearer token for authenticated access.</span>
          </div>
          <div className="auth-feature-item">
            <strong>Session restore</strong>
            <span>Your browser restores the saved session automatically when the token is still valid.</span>
          </div>
        </div>
      </article>

      <form className="auth-panel auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-copy">
          <span className="auth-kicker">Welcome back</span>
          <h2>Login</h2>
          <p>Enter your email and password to continue.</p>
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
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" className="primary-btn auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>

        <p className="auth-switch">
          Need an account?
          <button type="button" className="text-btn" onClick={onSwitchToRegister}>
            Register here
          </button>
        </p>

        <p className="auth-switch">
          Forgot your password?
          <button
            type="button"
            className="text-btn"
            onClick={() => onSwitchToForgotPassword(form.email)}
          >
            Reset it
          </button>
        </p>
      </form>
    </section>
  );
}
