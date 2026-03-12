import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function PlayerDashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTournaments = async () => {
      try {
        const res = await api.get('/player/tournaments');
        setTournaments(res.data.tournaments);
      } catch (err) {
        console.error('Failed to fetch tournaments');
      } finally {
        setLoading(false);
      }
    };
    fetchMyTournaments();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="player-dashboard">
      <h1>My Tournaments</h1>
      {tournaments.length === 0 ? (
        <div className="empty-state">
          <p>You haven&apos;t registered for any tournaments yet.</p>
          <Link to="/tournaments" className="btn btn-primary">Browse Tournaments</Link>
        </div>
      ) : (
        <div className="my-tournaments">
          {tournaments.map((t) => (
            <div key={t.id} className="my-tournament-card">
              <h3><Link to={`/tournaments/${t.id}`}>{t.title}</Link></h3>
              <p>📍 {t.location || 'TBD'}</p>
              <p>📅 {t.start_date ? new Date(t.start_date).toLocaleDateString() : 'TBD'}</p>
              <p>Status: <span className={`status-badge ${t.status}`}>{t.status}</span></p>
              <p>Payment: <span className={`payment-badge ${t.payment_status}`}>{t.payment_status}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
