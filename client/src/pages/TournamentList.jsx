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
    </div>
  );
}
