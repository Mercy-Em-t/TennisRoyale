import { useState } from 'react';
import { registerPlayer } from '../utils/api';

export default function RegistrationForm({ tournamentId, onRegistered }) {
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || !playerEmail.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await registerPlayer(tournamentId, playerName.trim(), playerEmail.trim());
      setPlayerName('');
      setPlayerEmail('');
      if (onRegistered) onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="registration-form">
      <h3>Register Player</h3>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Player name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Player email"
          value={playerEmail}
          onChange={(e) => setPlayerEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Registering…' : 'Register'}
        </button>
      </form>
    </div>
  );
}
