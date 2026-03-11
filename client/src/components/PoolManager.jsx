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
        players.forEach((p) => assignedIds.add(p.playerId || p.id));
      });
      setUnassigned(regs.filter((r) => !assignedIds.has(r.playerId || r.id)));
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
      playerId: p.playerId || p.id,
      seedPosition: p.seedPosition ?? p.seed ?? 0,
      playerName: p.playerName || p.player_name || p.Registration?.playerName || p.Registration?.player_name || findPlayerName(p.playerId || p.id),
    })).sort((a, b) => a.seedPosition - b.seedPosition);
  };

  const findPlayerName = (playerId) => {
    const reg = registrations.find((r) => (r.playerId || r.id) === playerId);
    return reg ? (reg.playerName || reg.player_name) : `Player ${playerId}`;
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
      if (status === 'late_registration_open' || status === 'late_registration_closed') {
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
                playerId: r.playerId || r.id,
                playerName: r.playerName || r.player_name,
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
                  <span className="player-name">{r.playerName}</span>
                  {r.isLateRegistration && <span className="late-badge">Late</span>}
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
    </div>
  );
}
