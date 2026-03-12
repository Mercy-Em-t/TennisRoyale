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
import React, { useState, useEffect } from 'react';
import { getStaff, addStaff, removeStaff } from '../utils/api';

const ROLES = ['referee', 'coordinator', 'medic', 'volunteer'];

export default function StaffManager({ tournamentId }) {
  const [staff, setStaff] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'referee', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, [tournamentId]);

  async function loadStaff() {
    try {
      const data = await getStaff(tournamentId);
      setStaff(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await addStaff(tournamentId, form);
      setForm({ name: '', role: 'referee', email: '' });
      setShowForm(false);
      loadStaff();
    } catch {
      /* empty */
    }
  }

  async function handleRemove(staffId) {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await removeStaff(tournamentId, staffId);
      loadStaff();
    } catch {
      /* empty */
    }
  }

  // Group staff by role
  const grouped = staff.reduce((acc, s) => {
    if (!acc[s.role]) acc[s.role] = [];
    acc[s.role].push(s);
    return acc;
  }, {});

  return (
    <div className="staff-manager" data-testid="staff-manager">
      <div className="section-header">
        <span className="staff-count">{staff.length} staff members</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {showForm && (
        <form className="inline-form" onSubmit={handleAdd} data-testid="staff-form">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            aria-label="Role"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <button type="submit" className="btn btn-primary btn-sm">Add</button>
        </form>
      )}

      {loading ? (
        <div className="loading">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="empty-state-sm">No staff members yet</div>
      ) : (
        Object.entries(grouped).map(([role, members]) => (
          <div key={role} className="staff-group">
            <h4 className="staff-role-title">{role.charAt(0).toUpperCase() + role.slice(1)}s ({members.length})</h4>
            {members.map((s) => (
              <div key={s.id} className="staff-item">
                <div className="staff-info">
                  <span className="staff-name">{s.name}</span>
                  {s.email && <span className="staff-email">{s.email}</span>}
                </div>
                <button
                  className="btn-icon btn-danger-icon"
                  onClick={() => handleRemove(s.id)}
                  aria-label={`Remove ${s.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
