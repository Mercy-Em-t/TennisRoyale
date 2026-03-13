import React, { useState, useEffect } from 'react';
import { getPools, createPool, addPlayerToPool, deletePool, getRegistrations } from '../api';

interface Player {
  player_id: number;
  player_name: string;
}

interface Pool {
  id: number;
  name: string;
  players: Player[];
}

export default function PoolManager({ tournamentId, onUpdate }: { tournamentId: number | string, onUpdate: () => void }) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [poolName, setPoolName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  async function loadData() {
    try {
      const [poolRes, regRes] = await Promise.all([
        getPools(Number(tournamentId)),
        getRegistrations(Number(tournamentId)),
      ]);
      setPools(Array.isArray(poolRes.data) ? poolRes.data : poolRes.data.pools || []);
      setPlayers(Array.isArray(regRes.data) ? regRes.data : regRes.data.players || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault();
    if (!poolName.trim()) return;
    try {
      await createPool(Number(tournamentId), poolName.trim());
      setPoolName('');
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleAssign(poolId: number, playerId: number) {
    try {
      await addPlayerToPool(Number(tournamentId), poolId, playerId);
      loadData();
    } catch {
      /* empty */
    }
  }

  async function handleDeletePool(poolId: number) {
    if (!window.confirm('Delete this pool?')) return;
    try {
      await deletePool(Number(tournamentId), poolId);
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  // Get unassigned players
  const assignedPlayerIds = new Set();
  pools.forEach(pool => pool.players?.forEach(pp => assignedPlayerIds.add(pp.player_id)));
  const unassigned = players.filter(p => !assignedPlayerIds.has(p.player_id));

  return (
    <div className="pool-manager">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-gray-900">Pool Management</h3>
        <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">{pools.length} Pools</span>
      </div>

      <form className="flex gap-2 mb-8" onSubmit={handleCreatePool}>
        <input
          type="text"
          placeholder="New pool name (e.g. Pool A)"
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
          Create
        </button>
      </form>

      {loading ? (
        <div className="text-center py-12 text-gray-500 italic">Initializing pools...</div>
      ) : (
        <div className="space-y-8">
          {unassigned.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <h4 className="text-amber-800 text-sm font-bold mb-4 flex items-center gap-2">
                <span>⚠️</span> Unassigned Players ({unassigned.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((p) => (
                  <div key={p.player_id} className="bg-white border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                    <span className="text-sm font-medium text-gray-800">{p.player_name}</span>
                    <select
                      className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 rounded px-1 py-0.5 border-none cursor-pointer focus:ring-0"
                      onChange={(e) => {
                        if (e.target.value) handleAssign(Number(e.target.value), p.player_id);
                        e.target.value = '';
                      }}
                      defaultValue=""
                    >
                      <option value="">Move to...</option>
                      {pools.map((pool) => (
                        <option key={pool.id} value={pool.id}>{pool.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pools.map((pool) => (
              <div key={pool.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition group">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{pool.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{pool.players?.length || 0} participants</span>
                  </div>
                  <button
                    className="text-gray-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition"
                    onClick={() => handleDeletePool(pool.id)}
                  >
                    🗑️
                  </button>
                </div>
                <div className="space-y-2">
                  {pool.players?.length === 0 ? (
                    <div className="text-center py-4 text-gray-300 text-xs italic border border-dashed rounded-lg">Drag or assign players here</div>
                  ) : (
                    pool.players?.map((pp, idx) => (
                      <div key={pp.player_id} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-transparent hover:border-blue-100 transition">
                        <span className="text-[10px] font-mono text-blue-400 font-bold w-4">#{idx + 1}</span>
                        <span className="text-sm font-medium text-gray-700">{pp.player_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {pools.length === 0 && (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <div className="text-4xl mb-4">🧊</div>
              <h4 className="text-gray-900 font-bold">No pools created</h4>
              <p className="text-gray-500 text-sm max-w-xs mx-auto mt-2">Create your first pool to start organizing registered players into groups.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
