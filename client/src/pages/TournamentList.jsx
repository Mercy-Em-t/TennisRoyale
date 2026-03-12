import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listTournaments, createTournament } from '../utils/api';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', date: '', location: '', max_participants: '', fee: '',
    poster_url: '', certificate_enabled: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTournaments = async () => {
    try {
      const data = await listTournaments();
      setTournaments(Array.isArray(data) ? data : data.tournaments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTournaments(); }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        date: form.date || undefined,
        location: form.location || undefined,
        max_participants: form.max_participants ? Number(form.max_participants) : undefined,
        fee: form.fee ? Number(form.fee) : undefined,
        poster_url: form.poster_url || undefined,
        certificate_enabled: form.certificate_enabled,
      };
      await createTournament(payload);
      setForm({ name: '', date: '', location: '', max_participants: '', fee: '', poster_url: '', certificate_enabled: false });
      setShowForm(false);
      await fetchTournaments();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading tournaments…</p>;

  return (
    <div className="tournament-list">
      <h2>Tournaments</h2>

      {error && <p className="error">{error}</p>}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} style={{ marginBottom: '1rem' }}>+ Create Tournament</button>
      ) : (
        <form onSubmit={handleCreate} className="create-tournament-form">
          <h3>Create Tournament</h3>
          <div className="form-grid">
            <label>
              Name <span className="required">*</span>
              <input type="text" name="name" placeholder="Tournament name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Date
              <input type="date" name="date" value={form.date} onChange={handleChange} />
            </label>
            <label>
              Location
              <input type="text" name="location" placeholder="Venue / City" value={form.location} onChange={handleChange} />
            </label>
            <label>
              Max Participants
              <input type="number" name="max_participants" placeholder="e.g. 32" min="2" value={form.max_participants} onChange={handleChange} />
            </label>
            <label>
              Fee ($)
              <input type="number" name="fee" placeholder="0.00" min="0" step="0.01" value={form.fee} onChange={handleChange} />
            </label>
            <label>
              Poster URL
              <input type="url" name="poster_url" placeholder="https://..." value={form.poster_url} onChange={handleChange} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" name="certificate_enabled" checked={form.certificate_enabled} onChange={handleChange} />
              Enable Participation Certificates
            </label>
          </div>
          <div className="form-actions">
            <button type="submit">Create Tournament</button>
            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {tournaments.length === 0 ? (
        <p className="empty">No tournaments yet. Create one above!</p>
      ) : (
        <ul className="tournament-items">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link to={`/tournaments/${t.id}`}>
                <div>
                  <span className="tournament-name">{t.name}</span>
                  {t.date && <span className="tournament-meta"> — {t.date}</span>}
                  {t.location && <span className="tournament-meta"> · {t.location}</span>}
                </div>
                <span className={`status-badge status-${t.status}`}>{t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTournaments, createTournament } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusLabels = {
  draft: 'Draft',
  registration_open: 'Registration Open',
  registration_closed: 'Registration Closed',
  in_progress: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
};

export default function TournamentList() {
  const { user, logout, switchToPlayer } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', date: '', location: '', max_participants: 32,
    fee: 0, service_fee: 0, prize_pool: 0,
    registration_deadline: '', rules: '', bracket_type: 'single_elimination'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    try {
      const data = await getTournaments();
      setTournaments(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createTournament(form);
      setForm({
        name: '', date: '', location: '', max_participants: 32,
        fee: 0, service_fee: 0, prize_pool: 0,
        registration_deadline: '', rules: '', bracket_type: 'single_elimination'
      });
      setShowForm(false);
      loadTournaments();
    } catch {
      /* empty */
    }
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title">🎾 TennisRoyale</h1>
            <p className="app-subtitle">Tournament Management System</p>
          </div>
          {user && (
            <div className="header-user">
              <span className="user-badge">🏟️ {user.name}</span>
              <button className="btn-sm btn-switch" onClick={switchToPlayer}>🎾 Player Mode</button>
              <button className="btn-back" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="page-content">
        <div className="section-header">
          <h2>My Tournaments</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Tournament'}
          </button>
        </div>

        {showForm && (
          <form className="create-form" onSubmit={handleCreate} data-testid="create-form">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="name">Tournament Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Spring Open 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  placeholder="e.g. Central Tennis Club"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="max">Max Participants</label>
                <input
                  id="max"
                  type="number"
                  min="2"
                  value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: parseInt(e.target.value) || 32 })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="fee">Entry Fee (KSh)</label>
                <input
                  id="fee"
                  type="number"
                  min="0"
                  placeholder="0 for free"
                  value={form.fee}
                  onChange={(e) => setForm({ ...form, fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="service_fee">Service Fee (KSh)</label>
                <input
                  id="service_fee"
                  type="number"
                  min="0"
                  placeholder="Platform service charge"
                  value={form.service_fee}
                  onChange={(e) => setForm({ ...form, service_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="prize_pool">Prize Pool (KSh)</label>
                <input
                  id="prize_pool"
                  type="number"
                  min="0"
                  placeholder="0 for no prize"
                  value={form.prize_pool}
                  onChange={(e) => setForm({ ...form, prize_pool: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="deadline">Registration Deadline</label>
                <input
                  id="deadline"
                  type="date"
                  value={form.registration_deadline}
                  onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="bracket_type">Bracket Type</label>
                <select
                  id="bracket_type"
                  value={form.bracket_type}
                  onChange={(e) => setForm({ ...form, bracket_type: e.target.value })}
                >
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="pool_play">Pool Play</option>
                </select>
              </div>
              <div className="form-field full-width">
                <label htmlFor="rules">Rules</label>
                <textarea
                  id="rules"
                  placeholder="e.g. Best of 3 sets. Tiebreak at 6-6."
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  rows="3"
                />
              </div>
            </div>
            {form.fee > 0 && (
              <div className="fee-preview">
                <span>💰 Player pays: <strong>KSh {(form.fee + form.service_fee).toLocaleString()}</strong></span>
                <span> · Platform (10%): <strong>KSh {(form.fee * 0.1 + form.service_fee).toLocaleString()}</strong></span>
                <span> · You receive: <strong>KSh {(form.fee * 0.9).toLocaleString()}</strong></span>
              </div>
            )}
            <button type="submit" className="btn btn-primary">Create Tournament</button>
          </form>
        )}

        {loading ? (
          <div className="loading">Loading tournaments...</div>
        ) : tournaments.length === 0 ? (
          <div className="empty-state">
            <p>🎾 No tournaments yet</p>
            <p>Create your first tournament to get started!</p>
          </div>
        ) : (
          <div className="tournament-grid">
            {tournaments.map((t) => (
              <Link to={`/tournaments/${t.id}`} key={t.id} className="tournament-card">
                <div className="tournament-card-header">
                  <h3>{t.name}</h3>
                  <span className={`status-badge status-${t.status}`}>
                    {statusLabels[t.status] || t.status}
                  </span>
                </div>
                <div className="tournament-card-details">
                  {t.date && <span>📅 {new Date(t.date).toLocaleDateString()}</span>}
                  {t.location && <span>📍 {t.location}</span>}
                  <span>👥 Max {t.max_participants}</span>
                  {t.fee > 0 && <span>💰 KSh {t.fee.toLocaleString()}</span>}
                  {t.fee === 0 && <span>🆓 Free</span>}
                  {t.prize_pool > 0 && <span>🏆 KSh {t.prize_pool.toLocaleString()}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
