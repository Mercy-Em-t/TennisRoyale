import React, { useState, useEffect } from 'react';
import { getRegistrations } from '../api';

interface Registration {
  id: number;
  player_name?: string;
  playerName?: string;
  player_email?: string;
  playerEmail?: string;
  is_late?: number | boolean;
  isLateRegistration?: number | boolean;
  created_at?: string;
  createdAt?: string;
}

export default function RegistrationList({ tournamentId }: { tournamentId: number | string }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegistrations = async () => {
    try {
      const res = await getRegistrations(Number(tournamentId));
      setRegistrations(Array.isArray(res.data) ? res.data : res.data.players || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRegistrations(); }, [tournamentId]);

  if (loading) return <div className="text-center py-10 text-gray-500 italic">Loading registrations...</div>;

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Registered Players ({registrations.length})</h3>
        <button
          className="text-blue-600 text-xs font-bold uppercase tracking-widest hover:text-blue-700 transition"
          onClick={fetchRegistrations}
        >
          Refresh List
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs mb-4 border border-red-100">⚠️ {error}</div>}

      {registrations.length === 0 ? (
        <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-2xl border border-dashed">No participants registered yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Pos</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Player</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pr-2">Reg. Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registrations.map((r, i) => {
                const name = r.playerName || r.player_name;
                const email = r.playerEmail || r.player_email;
                const isLate = r.isLateRegistration || r.is_late;
                const createdAt = r.createdAt || r.created_at;
                return (
                  <tr key={r.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 pl-2 text-xs font-mono text-gray-300">#{i + 1}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{email}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${isLate ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        {isLate ? 'Late' : 'Regular'}
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-xs text-gray-500 font-medium">
                      {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
