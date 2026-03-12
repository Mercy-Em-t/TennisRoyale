import React, { useEffect, useState, useCallback } from 'react';
import {
  getRegistrations,
  acceptRegistration,
  rejectRegistration,
  setSeed,
  submitRegistration,
} from '../api';
import { Player, Tournament } from '../types';

interface Props {
  tournamentId: number;
  tournament: Tournament;
  onRefresh?: () => void;
}

type FilterTab = 'all' | 'pending' | 'accepted' | 'rejected' | 'late';

export default function RegistrationsPage({ tournamentId, tournament, onRefresh }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [seedInputs, setSeedInputs] = useState<Record<number, string>>({});
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getRegistrations(tournamentId);
      setPlayers(res.data.players || res.data || []);
    } catch {
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (playerId: number) => {
    try {
      await acceptRegistration(tournamentId, playerId);
      await load();
      onRefresh?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to accept');
    }
  };

  const handleReject = async (playerId: number) => {
    try {
      await rejectRegistration(tournamentId, playerId);
      await load();
      onRefresh?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to reject');
    }
  };

  const handleSetSeed = async (playerId: number) => {
    const val = seedInputs[playerId];
    const seed = val === '' || val === undefined ? null : Number(val);
    try {
      await setSeed(tournamentId, playerId, seed);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to set seed');
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await submitRegistration(tournamentId, addForm);
      await load();
      setShowAddPlayer(false);
      setAddForm({ name: '', email: '', phone: '' });
      onRefresh?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to add player');
    } finally {
      setAdding(false);
    }
  };

  const filtered = players.filter((p) => filter === 'all' || p.status === filter);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      late: 'bg-blue-100 text-blue-700',
      withdrawn: 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-500'}`}>{status}</span>;
  };

  const filterCounts = {
    all: players.length,
    pending: players.filter(p => p.status === 'pending').length,
    accepted: players.filter(p => p.status === 'accepted').length,
    rejected: players.filter(p => p.status === 'rejected').length,
    late: players.filter(p => p.status === 'late').length,
  };

  const canRegister = tournament.status === 'registration_open';

  return (
    <div className="space-y-4">
      {canRegister && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-medium text-blue-700">Registration is open</p>
          <p className="text-sm text-blue-600 mt-1">Share tournament ID <strong>{tournamentId}</strong> with players to register.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            {(['all', 'pending', 'accepted', 'rejected', 'late'] as FilterTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({filterCounts[f]})
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddPlayer(true)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            + Add Player
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No players found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Seed</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((player) => (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{player.name}</td>
                    <td className="px-3 py-2 text-gray-600">{player.email}</td>
                    <td className="px-3 py-2 text-gray-600">{player.phone}</td>
                    <td className="px-3 py-2">{statusBadge(player.status)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder={player.seed !== null ? String(player.seed) : '—'}
                          value={seedInputs[player.id] ?? (player.seed !== null ? String(player.seed) : '')}
                          onChange={(e) => setSeedInputs({ ...seedInputs, [player.id]: e.target.value })}
                          className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min={1}
                        />
                        <button
                          onClick={() => handleSetSeed(player.id)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                        >
                          Set
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        {player.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAccept(player.id)}
                              className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(player.id)}
                              className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {player.status === 'accepted' && (
                          <button
                            onClick={() => handleReject(player.id)}
                            className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs hover:bg-red-200 transition"
                          >
                            Reject
                          </button>
                        )}
                        {player.status === 'rejected' && (
                          <button
                            onClick={() => handleAccept(player.id)}
                            className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs hover:bg-green-200 transition"
                          >
                            Accept
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Player</h3>
            <form onSubmit={handleAddPlayer} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {adding ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
