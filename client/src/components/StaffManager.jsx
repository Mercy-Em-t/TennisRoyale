import { useState, useEffect } from 'react';
import { listStaff, addStaff, removeStaff } from '../utils/api';

export default function StaffManager({ tournamentId }) {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('referee');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    try {
      const data = await listStaff(tournamentId);
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, [tournamentId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await addStaff(tournamentId, { name: name.trim(), role, email: email.trim() || undefined });
      setName('');
      setEmail('');
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (staffId) => {
    setError('');
    try {
      await removeStaff(tournamentId, staffId);
      await fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading staff…</p>;

  const referees = staff.filter(s => s.role === 'referee');
  const marshals = staff.filter(s => s.role === 'court_marshal');

  return (
    <div className="staff-manager">
      <h3>Staff Management</h3>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleAdd} className="staff-form">
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <select value={role} onChange={e => setRole(e.target.value)}>
          <option value="referee">Referee</option>
          <option value="court_marshal">Court Marshal</option>
        </select>
        <input type="email" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
        <button type="submit">Add Staff</button>
      </form>

      <div className="staff-columns">
        <div className="staff-column">
          <h4>Referees ({referees.length})</h4>
          {referees.length === 0 ? <p className="empty">No referees assigned</p> : (
            <ul className="staff-list">
              {referees.map(s => (
                <li key={s.id}>
                  <span>{s.name}{s.email ? ` (${s.email})` : ''}</span>
                  <button className="btn-small btn-cancel" onClick={() => handleRemove(s.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="staff-column">
          <h4>Court Marshals ({marshals.length})</h4>
          {marshals.length === 0 ? <p className="empty">No marshals assigned</p> : (
            <ul className="staff-list">
              {marshals.map(s => (
                <li key={s.id}>
                  <span>{s.name}{s.email ? ` (${s.email})` : ''}</span>
                  <button className="btn-small btn-cancel" onClick={() => handleRemove(s.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
