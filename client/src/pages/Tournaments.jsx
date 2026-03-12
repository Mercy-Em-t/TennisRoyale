import { useState, useEffect } from 'react';
import api from '../utils/api';
import TournamentCard from '../components/TournamentCard';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sport: '', location: '' });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.sport) params.sport = filters.sport;
      if (filters.location) params.location = filters.location;
      
      const res = await api.get('/tournaments', { params });
      setTournaments(res.data.tournaments);
    } catch (err) {
      console.error('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchTournaments();
  };

  return (
    <div className="tournaments-page">
      <h1>Browse Tournaments</h1>
      <form onSubmit={handleFilter} className="filters">
        <input
          type="text"
          placeholder="Sport"
          value={filters.sport}
          onChange={(e) => setFilters({ ...filters, sport: e.target.value })}
        />
        <input
          type="text"
          placeholder="Location"
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>
      {loading ? (
        <p>Loading tournaments...</p>
      ) : tournaments.length === 0 ? (
        <p>No tournaments found.</p>
      ) : (
        <div className="tournament-grid">
          {tournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t} />
          ))}
        </div>
      )}
    </div>
  );
}
