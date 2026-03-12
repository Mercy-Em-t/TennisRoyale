import React, { useState, useEffect } from 'react';
import { getPools, createPool, addPlayerToPool, deletePool, getRegistrations } from '../utils/api';

export default function PoolManager({ tournamentId, onUpdate }) {
  const [pools, setPools] = useState([]);
  const [players, setPlayers] = useState([]);
  const [poolName, setPoolName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  async function loadData() {
    try {
      const [poolData, regData] = await Promise.all([
        getPools(tournamentId),
        getRegistrations(tournamentId),
      ]);
      setPools(poolData);
      setPlayers(regData);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePool(e) {
    e.preventDefault();
    if (!poolName.trim()) return;
    try {
      await createPool(tournamentId, { name: poolName });
      setPoolName('');
      loadData();
      onUpdate();
    } catch {
      /* empty */
    }
  }

  async function handleAssign(poolId, playerId) {
    try {
      await addPlayerToPool(tournamentId, poolId, { player_id: playerId });
      loadData();
    } catch {
      /* empty */
    }
  }

  async function handleDeletePool(poolId) {
    if (!window.confirm('Delete this pool?')) return;
    try {
      await deletePool(tournamentId, poolId);
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
    <div className="pool-manager" data-testid="pool-manager">
      <div className="section-header">
        <h2 className="section-title">Pool Management</h2>
      </div>

      <form className="inline-form" onSubmit={handleCreatePool}>
        <input
          type="text"
          placeholder="New pool name (e.g. Pool A)"
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary btn-sm">Create Pool</button>
      </form>

      {loading ? (
        <div className="loading">Loading pools...</div>
      ) : (
        <>
          {/* Unassigned players */}
          {unassigned.length > 0 && (
            <div className="pool-card unassigned-pool">
              <h3 className="pool-title">Unassigned Players ({unassigned.length})</h3>
              <div className="pool-players">
                {unassigned.map((p) => (
                  <div key={p.player_id} className="pool-player-item">
                    <span>{p.player_name}</span>
                    {pools.length > 0 && (
                      <select
                        className="assign-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) handleAssign(e.target.value, p.player_id);
                          e.target.value = '';
                        }}
                        aria-label={`Assign ${p.player_name} to pool`}
                      >
                        <option value="">Assign to...</option>
                        {pools.map((pool) => (
                          <option key={pool.id} value={pool.id}>{pool.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pool cards */}
          <div className="pool-grid">
            {pools.map((pool) => (
              <div key={pool.id} className="pool-card">
                <div className="pool-header">
                  <h3 className="pool-title">{pool.name}</h3>
                  <div className="pool-actions">
                    <span className="pool-count">{pool.players?.length || 0} players</span>
                    <button
                      className="btn-icon btn-danger-icon"
                      onClick={() => handleDeletePool(pool.id)}
                      aria-label={`Delete ${pool.name}`}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="pool-players">
                  {pool.players?.length === 0 ? (
                    <div className="empty-state-sm">No players assigned</div>
                  ) : (
                    pool.players?.map((pp, idx) => (
                      <div key={pp.player_id} className="pool-player-item">
                        <span className="seed-num">#{idx + 1}</span>
                        <span>{pp.player_name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {pools.length === 0 && (
            <div className="empty-state-sm">No pools created yet. Create a pool to start organizing players.</div>
          )}
        </>
      )}
    </div>
  );
}
