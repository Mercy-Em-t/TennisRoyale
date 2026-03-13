import React, { useState, useEffect } from 'react';
import { getRegistrations, addRegistration, removeRegistration } from '../api';

interface Registration {
  id: number;
  player_name: string;
  player_email: string;
  is_late: number | boolean;
}

interface RegistrationManagerProps {
  tournamentId: number | string;
  tournament: any;
  onUpdate: () => void;
}

export default function RegistrationManager({ tournamentId, tournament, onUpdate }: RegistrationManagerProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegistrations();
  }, [tournamentId]);

  async function loadRegistrations() {
    try {
      const res = await getRegistrations(Number(tournamentId));
      setRegistrations(Array.isArray(res.data) ? res.data : res.data.players || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      await addRegistration(Number(tournamentId), form);
      setForm({ name: '', email: '' });
      setShowForm(false);
      loadRegistrations();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleRemove(regId: number) {
    if (!window.confirm('Remove this registration?')) return;
    try {
      await removeRegistration(Number(tournamentId), regId);
      loadRegistrations();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  const canRegister = tournament.status === 'registration_open' || tournament.late_registration_open;

  return (
    <div className="registration-manager">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Registered Players</h3>
          <p className="text-xs text-gray-400 mt-1">{registrations.length} of {tournament.max_participants || '--'} spots filled</p>
        </div>
        {canRegister && (
          <button
            className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Player'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8 space-y-3" onSubmit={handleAdd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Player full name"
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email address"
              className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm">Confirm Registration</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 italic">Retreiving player list...</div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-4">👥</div>
          <h4 className="text-gray-900 font-bold">No registered players</h4>
          <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Players will appear here once they register for the tournament.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {registrations.map((reg) => (
            <div key={reg.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition group">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 truncate block">{reg.player_name}</span>
                    {Number(reg.is_late) === 1 && <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Late</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium truncate block mt-0.5">{reg.player_email}</span>
                </div>
                <button
                  className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"
                  onClick={() => handleRemove(reg.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
