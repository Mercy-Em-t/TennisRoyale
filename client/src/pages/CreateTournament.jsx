import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', sport: 'tennis', location: '',
    entry_fee: 0, max_players: 32,
    registration_deadline: '', start_date: '', end_date: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'entry_fee' || name === 'max_players' ? Number(value) : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/tournaments', form);
      // Auto-publish
      await api.post(`/tournaments/${res.data.tournament.id}/publish`);
      navigate(`/tournaments/${res.data.tournament.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-tournament">
      <h1>Create Tournament</h1>
      <form onSubmit={handleSubmit} className="tournament-form">
        {error && <p className="error">{error}</p>}
        <label>Title *
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>Description
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>
        <label>Sport
          <input name="sport" value={form.sport} onChange={handleChange} />
        </label>
        <label>Location
          <input name="location" value={form.location} onChange={handleChange} />
        </label>
        <div className="form-row">
          <label>Entry Fee ($)
            <input name="entry_fee" type="number" min="0" step="0.01" value={form.entry_fee} onChange={handleChange} />
          </label>
          <label>Max Players
            <input name="max_players" type="number" min="2" value={form.max_players} onChange={handleChange} />
          </label>
        </div>
        <div className="form-row">
          <label>Start Date
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>
          <label>End Date
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </label>
        </div>
        <label>Registration Deadline
          <input name="registration_deadline" type="date" value={form.registration_deadline} onChange={handleChange} />
        </label>
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Creating...' : 'Create & Publish Tournament'}
        </button>
      </form>
    </div>
  );
}
