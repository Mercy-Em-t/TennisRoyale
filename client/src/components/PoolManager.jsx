import { useState, useEffect, useRef } from 'react';
import {
  listRegistrations,
  getPools,
  createPools,
  updatePoolPlayers,
  appendLateRegistrations,
} from '../utils/api';

export default function PoolManager({ tournamentId, status, onPoolsChanged }) {
  const [pools, setPools] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [newPoolName, setNewPoolName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [dragData, setDragData] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const dragCounter = useRef({});

  const fetchData = async () => {
    try {
      const [regData, poolData] = await Promise.all([
        listRegistrations(tournamentId),
        getPools(tournamentId),
      ]);
      const regs = Array.isArray(regData) ? regData : regData.registrations || [];
      const fetchedPools = Array.isArray(poolData) ? poolData : poolData.pools || [];

      setRegistrations(regs);
      setPools(fetchedPools);

      const assignedIds = new Set();
      fetchedPools.forEach((pool) => {
        const players = pool.players || pool.PoolPlayers || [];
        players.forEach((p) => assignedIds.add(p.player_id || p.playerId || p.id));
      });
      setUnassigned(regs.filter((r) => !assignedIds.has(r.player_id || r.playerId || r.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tournamentId]);

  const getPoolPlayers = (pool) => {
    const players = pool.players || pool.PoolPlayers || [];
    return players.map((p) => ({
      playerId: p.player_id || p.playerId || p.id,
      seedPosition: p.seed_position ?? p.seedPosition ?? p.seed ?? 0,
      playerName: p.player_name || p.playerName || p.Registration?.playerName || p.Registration?.player_name || findPlayerName(p.player_id || p.playerId || p.id),
    })).sort((a, b) => a.seedPosition - b.seedPosition);
  };

  const findPlayerName = (playerId) => {
    const reg = registrations.find((r) => (r.player_id || r.playerId || r.id) === playerId);
    return reg ? (reg.player_name || reg.playerName) : `Player ${playerId}`;
  };

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    setError('');
    try {
      await createPools(tournamentId, [{ name: newPoolName.trim(), players: [] }]);
      setNewPoolName('');
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Drag handlers
  const handleDragStart = (e, player, sourcePoolId) => {
    const data = { player, sourcePoolId };
    setDragData(data);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDragData(null);
    setDropTarget(null);
    dragCounter.current = {};
  };

  const handleDragEnter = (e, targetId) => {
    e.preventDefault();
    dragCounter.current[targetId] = (dragCounter.current[targetId] || 0) + 1;
    setDropTarget(targetId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e, targetId) => {
    dragCounter.current[targetId] = (dragCounter.current[targetId] || 0) - 1;
    if (dragCounter.current[targetId] <= 0) {
      dragCounter.current[targetId] = 0;
      if (dropTarget === targetId) {
        setDropTarget(null);
      }
    }
  };

  const handleDropOnPool = async (e, targetPoolId, insertIndex) => {
    e.preventDefault();
    setDropTarget(null);
    dragCounter.current = {};

    let data = dragData;
    if (!data) {
      try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    }

    const { player, sourcePoolId } = data;
    setDragData(null);

    if (sourcePoolId === targetPoolId) {
      // Reorder within the same pool
      const pool = pools.find((p) => p.id === targetPoolId);
      if (!pool) return;
      const players = getPoolPlayers(pool).filter((p) => p.playerId !== player.playerId);
      const idx = insertIndex !== undefined ? insertIndex : players.length;
      players.splice(idx, 0, { playerId: player.playerId, seedPosition: 0 });
      const reseeded = players.map((p, i) => ({ playerId: p.playerId, seedPosition: i + 1 }));
      try {
        await updatePoolPlayers(tournamentId, targetPoolId, reseeded);
        await fetchData();
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    // Moving from unassigned or another pool
    if (sourcePoolId === 'unassigned') {
      // If late registration, use append endpoint
      if (status === 'in_progress_late_open') {
        try {
          await appendLateRegistrations(tournamentId, [
            { playerId: player.playerId, poolId: targetPoolId, seedPosition: insertIndex != null ? insertIndex + 1 : 999 },
          ]);
          await fetchData();
          if (onPoolsChanged) onPoolsChanged();
        } catch (err) {
          setError(err.message);
        }
        return;
      }
    }

    // Move between pools: remove from source, add to target
    try {
      if (sourcePoolId && sourcePoolId !== 'unassigned') {
        const srcPool = pools.find((p) => p.id === sourcePoolId);
        if (srcPool) {
          const srcPlayers = getPoolPlayers(srcPool)
            .filter((p) => p.playerId !== player.playerId)
            .map((p, i) => ({ playerId: p.playerId, seedPosition: i + 1 }));
          await updatePoolPlayers(tournamentId, sourcePoolId, srcPlayers);
        }
      }

      const tgtPool = pools.find((p) => p.id === targetPoolId);
      if (tgtPool) {
        const tgtPlayers = getPoolPlayers(tgtPool).filter((p) => p.playerId !== player.playerId);
        const idx = insertIndex !== undefined ? insertIndex : tgtPlayers.length;
        tgtPlayers.splice(idx, 0, { playerId: player.playerId, seedPosition: 0 });
        const reseeded = tgtPlayers.map((p, i) => ({ playerId: p.playerId, seedPosition: i + 1 }));
        await updatePoolPlayers(tournamentId, targetPoolId, reseeded);
      }

      await fetchData();
      if (onPoolsChanged) onPoolsChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDropOnPlayerSlot = (e, targetPoolId, insertIndex) => {
    handleDropOnPool(e, targetPoolId, insertIndex);
  };

  if (loading) return <p>Loading pools…</p>;

  return (
    <div className="pool-manager">
      <h3>Pool Management</h3>
      {error && <p className="error">{error}</p>}

      <div className="pool-controls">
        <input
          type="text"
          placeholder="New pool name"
          value={newPoolName}
          onChange={(e) => setNewPoolName(e.target.value)}
        />
        <button onClick={handleCreatePool}>Add Pool</button>
      </div>

      <div className="pool-layout">
        {/* Unassigned players */}
        <div
          className={`pool-column unassigned-pool ${dropTarget === 'unassigned' ? 'drop-hover' : ''}`}
          onDragEnter={(e) => handleDragEnter(e, 'unassigned')}
          onDragOver={handleDragOver}
          onDragLeave={(e) => handleDragLeave(e, 'unassigned')}
        >
          <h4>Unassigned ({unassigned.length})</h4>
          <div className="pool-players">
            {unassigned.map((r) => {
              const player = {
                playerId: r.player_id || r.playerId || r.id,
                playerName: r.player_name || r.playerName,
                seedPosition: 0,
              };
              return (
                <div
                  key={player.playerId}
                  className="player-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, player, 'unassigned')}
                  onDragEnd={handleDragEnd}
                >
                  <span className="player-name">{player.playerName}</span>
                  {(r.is_late || r.isLateRegistration) ? <span className="late-badge">Late</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pool columns */}
        {pools.map((pool) => {
          const players = getPoolPlayers(pool);
          return (
            <div
              key={pool.id}
              className={`pool-column ${dropTarget === pool.id ? 'drop-hover' : ''}`}
              onDragEnter={(e) => handleDragEnter(e, pool.id)}
              onDragOver={handleDragOver}
              onDragLeave={(e) => handleDragLeave(e, pool.id)}
              onDrop={(e) => handleDropOnPool(e, pool.id)}
            >
              <h4>{pool.name} ({players.length})</h4>
              <div className="pool-players">
                {players.map((p, idx) => (
                  <div key={p.playerId} className="player-slot">
                    <div
                      className="drop-indicator"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnPlayerSlot(e, pool.id, idx)}
                    />
                    <div
                      className="player-card in-pool"
                      draggable
                      onDragStart={(e) => handleDragStart(e, p, pool.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <span className="seed-number">#{p.seedPosition}</span>
                      <span className="player-name">{p.playerName}</span>
                    </div>
                  </div>
                ))}
                {/* Drop zone at end of pool */}
                <div
                  className="drop-indicator end-indicator"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnPlayerSlot(e, pool.id, players.length)}
                />
              </div>
            </div>
          );
        })}
      </div>
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
