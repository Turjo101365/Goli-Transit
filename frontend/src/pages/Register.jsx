import { useState } from 'react';

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
};

export function Register({ onRegister, onSwitchToLogin }) {
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
      await onRegister(form);
    } catch (authError) {
      setError(authError.message || 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page fade-in">
      <article className="auth-panel auth-panel-feature register-feature">
        <span className="auth-kicker">Create your account</span>
        <h2>Register a real commuter profile for GoliTransit.</h2>
        <p>
          Create a user in the backend database so authenticated planning and anomaly tools work end
          to end.
        </p>
        <div className="auth-stat-grid">
          <div className="auth-stat-card">
            <strong>Stored in MySQL</strong>
            <span>Your account record is created in the `users` table.</span>
          </div>
          <div className="auth-stat-card">
            <strong>Instant access</strong>
            <span>You are automatically signed in right after successful registration.</span>
          </div>
        </div>
      </article>

      <form className="auth-panel auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-copy">
          <span className="auth-kicker">New account</span>
          <h2>Register</h2>
          <p>Create your demo profile in a few seconds.</p>
        </div>

        <label>
          Full Name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Turjo"
            autoComplete="name"
            required
          />
        </label>

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
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="auth-switch">
          Already registered?
          <button type="button" className="text-btn" onClick={onSwitchToLogin}>
            Login here
          </button>
        </p>
      </form>
    </section>
  );
}
