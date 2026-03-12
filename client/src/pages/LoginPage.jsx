import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { registerUser, loginUser } from '../utils/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'player' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        if (!form.name.trim()) { setError('Name is required'); setLoading(false); return; }
        data = await registerUser(form);
      } else {
        data = await loginUser({ email: form.email, password: form.password });
      }
      login(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🎾 TennisRoyale</h1>
          <p className="app-subtitle">Tournament Management System</p>
        </div>
      </header>

      <main className="page-content auth-page">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${!isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(false); setError(null); }}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(true); setError(null); }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" data-testid="auth-form">
            {isRegister && (
              <div className="form-field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. John Smith"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required={isRegister}
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            {isRegister && (
              <div className="form-field">
                <label htmlFor="role">I am a...</label>
                <div className="role-selector">
                  {[
                    { value: 'player', label: '🎾 Player', desc: 'Register for tournaments & view matches' },
                    { value: 'host', label: '🏟️ Host', desc: 'Create & manage tournaments' },
                    { value: 'referee', label: '📋 Referee', desc: 'Score & officiate matches' },
                  ].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`role-option ${form.role === r.value ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, role: r.value })}
                    >
                      <span className="role-label">{r.label}</span>
                      <span className="role-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
