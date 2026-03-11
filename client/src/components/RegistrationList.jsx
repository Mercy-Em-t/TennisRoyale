import { useState, useEffect } from 'react';
import { listRegistrations } from '../utils/api';

export default function RegistrationList({ tournamentId }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegistrations = async () => {
    try {
      const data = await listRegistrations(tournamentId);
      setRegistrations(Array.isArray(data) ? data : data.registrations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, [tournamentId]);

  if (loading) return <p>Loading registrations…</p>;

  return (
    <div className="registration-list">
      <h3>Registered Players ({registrations.length})</h3>
      {error && <p className="error">{error}</p>}
      {registrations.length === 0 ? (
        <p className="empty">No players registered yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Type</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((r, i) => {
              const name = r.playerName || r.player_name;
              const email = r.playerEmail || r.player_email;
              const isLate = r.isLateRegistration || r.is_late;
              const createdAt = r.createdAt || r.created_at;
              return (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{name}</td>
                  <td>{email}</td>
                  <td>
                    <span className={`reg-type ${isLate ? 'late' : 'regular'}`}>
                      {isLate ? 'Late' : 'Regular'}
                    </span>
                  </td>
                  <td>{createdAt ? new Date(createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <button className="refresh-btn" onClick={fetchRegistrations}>Refresh</button>
    </div>
  );
}
