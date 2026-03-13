import React, { useState, useEffect } from 'react';
import { getStaff, addStaff, removeStaff } from '../api';

const ROLES = ['referee', 'coordinator', 'medic', 'volunteer'];

interface StaffMember {
  id: number;
  name: string;
  role: string;
  email?: string;
}

export default function StaffManager({ tournamentId }: { tournamentId: number | string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: 'referee', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, [tournamentId]);

  async function loadStaff() {
    try {
      const res = await getStaff(Number(tournamentId));
      setStaff(res.data.staff || res.data || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await addStaff(Number(tournamentId), form);
      setForm({ name: '', role: 'referee', email: '' });
      setShowForm(false);
      loadStaff();
    } catch {
      /* empty */
    }
  }

  async function handleRemove(staffId: number) {
    if (!window.confirm('Remove this staff member?')) return;
    try {
      await removeStaff(Number(tournamentId), staffId);
      loadStaff();
    } catch {
      /* empty */
    }
  }

  const grouped = staff.reduce((acc: Record<string, StaffMember[]>, s) => {
    if (!acc[s.role]) acc[s.role] = [];
    acc[s.role].push(s);
    return acc;
  }, {});

  return (
    <div className="staff-manager" data-testid="staff-manager">
      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-500 text-sm">{staff.length} staff members</span>
        <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Staff'}
        </button>
      </div>

      {showForm && (
        <form className="bg-gray-50 p-4 rounded-xl border mb-6 space-y-3" onSubmit={handleAdd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Name"
              className="border p-2 rounded-lg text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <select
              value={form.role}
              className="border p-2 rounded-lg text-sm"
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <input
              type="email"
              placeholder="Email (optional)"
              className="border p-2 rounded-lg text-sm"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Add Staff Member</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed">No staff members assigned yet</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([role, members]) => (
            <div key={role}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 ml-1">{role}s ({members.length})</h4>
              <div className="grid gap-2">
                {members.map((s) => (
                  <div key={s.id} className="bg-white p-3 rounded-lg border flex items-center justify-between group hover:border-blue-200 transition">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                      {s.email && <span className="text-xs text-gray-500">{s.email}</span>}
                    </div>
                    <button
                      className="text-gray-300 hover:text-red-500 p-2 transition opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemove(s.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
