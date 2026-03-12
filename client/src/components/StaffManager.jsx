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
