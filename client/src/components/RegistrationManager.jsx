import React, { useState, useEffect } from 'react';
import { getRegistrations, addRegistration, removeRegistration } from '../utils/api';

export default function RegistrationManager({ tournamentId, tournament, onUpdate }) {
  const [registrations, setRegistrations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, [tournamentId]);

  async function loadRegistrations() {
    try {
      const data = await getRegistrations(tournamentId);
      setRegistrations(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      await addRegistration(tournamentId, form);
      setForm({ name: '', email: '' });
      setShowForm(false);
      loadRegistrations();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleRemove(regId) {
    if (!window.confirm('Remove this registration?')) return;
    try {
      await removeRegistration(tournamentId, regId);
      loadRegistrations();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  const canRegister = ['registration_open'].includes(tournament.status) ||
    tournament.late_registration_open;

  return (
    <div className="registration-manager" data-testid="registration-manager">
      <div className="section-header">
        <h2 className="section-title">Player Registrations</h2>
        {canRegister && (
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Player'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleAdd} data-testid="registration-form">
          <input
            type="text"
            placeholder="Player name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <button type="submit" className="btn btn-primary btn-sm">Register</button>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading registrations...</div>
      ) : registrations.length === 0 ? (
        <div className="empty-state-sm">No players registered yet</div>
      ) : (
        <div className="player-list">
          {registrations.map((reg) => (
            <div key={reg.id} className="player-card">
              <div className="player-info">
                <span className="player-name">{reg.player_name}</span>
                <span className="player-email">{reg.player_email}</span>
                {reg.is_late === 1 && <span className="badge badge-late">Late</span>}
              </div>
              <button
                className="btn-icon btn-danger-icon"
                onClick={() => handleRemove(reg.id)}
                aria-label={`Remove ${reg.player_name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="list-count">
        {registrations.length} / {tournament.max_participants} players
      </div>
    </div>
  );
}
