import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import RevenueSummary from '../components/RevenueSummary';

export default function HostDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes] = await Promise.all([
          api.get('/host/dashboard'),
        ]);
        setDashboard(dashRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleWithdraw = async (tournamentId) => {
    try {
      const res = await api.post('/host/withdraw', { tournament_id: tournamentId });
      setMessage(`Withdrawn $${res.data.amount} successfully!`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Withdrawal failed');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="host-dashboard">
      <h1>Host Dashboard</h1>
      {dashboard && <RevenueSummary dashboard={dashboard} />}
      
      <div className="dashboard-actions">
        <Link to="/host/create-tournament" className="btn btn-primary">+ Create Tournament</Link>
      </div>

      {message && <p className="info">{message}</p>}
    </div>
  );
}
