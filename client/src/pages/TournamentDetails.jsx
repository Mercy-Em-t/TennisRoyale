import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import PaymentModal from '../components/PaymentModal';

export default function TournamentDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const res = await api.get(`/tournaments/${id}`);
      setTournament(res.data.tournament);
    } catch (err) {
      setMessage('Tournament not found');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setRegistering(true);
    setMessage('');
    try {
      await api.post(`/tournaments/${id}/register`);
      setMessage('Registered! Please complete payment.');
      setShowPayment(true);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setMessage('Payment successful! You are confirmed for this tournament.');
    fetchTournament();
  };

  const copyRegistrationLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setMessage('Link copied!');
  };

  if (loading) return <p>Loading...</p>;
  if (!tournament) return <p>Tournament not found</p>;

  const available = tournament.max_players - tournament.current_players;

  return (
    <div className="tournament-details">
      <h1>{tournament.title}</h1>
      <div className="details-grid">
        <div className="detail-card">
          <h3>Tournament Info</h3>
          <p><strong>Sport:</strong> {tournament.sport}</p>
          {tournament.description && <p>{tournament.description}</p>}
          {tournament.location && <p><strong>Location:</strong> {tournament.location}</p>}
          {tournament.start_date && <p><strong>Start:</strong> {new Date(tournament.start_date).toLocaleDateString()}</p>}
          {tournament.end_date && <p><strong>End:</strong> {new Date(tournament.end_date).toLocaleDateString()}</p>}
          {tournament.registration_deadline && (
            <p><strong>Registration Deadline:</strong> {new Date(tournament.registration_deadline).toLocaleDateString()}</p>
          )}
          <p><strong>Status:</strong> <span className={`status-badge ${tournament.status}`}>{tournament.status}</span></p>
        </div>
        <div className="detail-card">
          <h3>Entry &amp; Slots</h3>
          <p className="entry-fee">${tournament.entry_fee}</p>
          <p><strong>Available Slots:</strong> {available} / {tournament.max_players}</p>
          {tournament.host_name && <p><strong>Host:</strong> {tournament.host_name}</p>}
        </div>
      </div>

      {message && <p className={message.includes('successful') || message.includes('copied') ? 'success' : 'info'}>{message}</p>}

      <div className="actions">
        {tournament.status === 'published' && available > 0 && (
          <button onClick={handleRegister} disabled={registering} className="btn btn-primary btn-large">
            {registering ? 'Registering...' : 'Register Now'}
          </button>
        )}
        <button onClick={copyRegistrationLink} className="btn btn-secondary">
          📋 Copy Registration Link
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          tournament={tournament}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
