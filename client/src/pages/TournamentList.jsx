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
  const [form, setForm] = useState({ name: '', date: '', location: '', max_participants: 32 });
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
      setForm({ name: '', date: '', location: '', max_participants: 32 });
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
            </div>
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
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
