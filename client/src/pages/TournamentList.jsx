import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listTournaments, createTournament } from '../utils/api';

export default function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState('');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await createTournament(name.trim());
      setName('');
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

      <form onSubmit={handleCreate} className="create-form">
        <input
          type="text"
          placeholder="Tournament name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Create Tournament</button>
      </form>

      {tournaments.length === 0 ? (
        <p className="empty">No tournaments yet. Create one above!</p>
      ) : (
        <ul className="tournament-items">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link to={`/tournaments/${t.id}`}>
                <span className="tournament-name">{t.name}</span>
                <span className={`status-badge status-${t.status}`}>{t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
