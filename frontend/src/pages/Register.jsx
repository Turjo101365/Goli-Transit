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
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
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
    <section className="login-container about-section fade-in">
      <div className="login-card about-card feature-card card-3d hover-glow">

        <h2 className="section-title neon-glow" style={{fontSize: '1.8rem', marginBottom: '0.5rem', textAlign: 'center'}}>
          Create Account
        </h2>

        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center'}}>
          Join GoliTransit to access personalized route planning and real-time traffic updates.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>

          {/* FULL NAME */}
          <div className="floating-group">
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Full Name</label>
          </div>

          {/* EMAIL */}
          <div className="floating-group">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Email</label>
          </div>

          {/* PASSWORD */}
          <div className="floating-group" style={{position: 'relative'}}>
            <input
              type={showPassword1 ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Password</label>
            <button
              type="button"
              onClick={() => setShowPassword1(!showPassword1)}
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
              {showPassword1 ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="floating-group" style={{position: 'relative'}}>
            <input
              type={showPassword2 ? 'text' : 'password'}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder=" "
              required
            />
            <label>Confirm Password</label>
            <button
              type="button"
              onClick={() => setShowPassword2(!showPassword2)}
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
              {showPassword2 ? 'Hide' : 'Show'}
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <p className="error-box">
              {error}
            </p>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            className="primary-btn auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="loader-wrap">
                <span className="loader"></span>
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>

          {/* LINKS */}
          <div className="auth-links">
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="text-btn"
                onClick={onSwitchToLogin}
              >
                Sign in
              </button>
            </p>
          </div>

        </form>
      </div>
    </section>
  );
}
