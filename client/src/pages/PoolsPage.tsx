import React, { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  getPools,
  getRegistrations,
  createPool,
  deletePool,
  addPlayerToPool,
  removePlayerFromPool,
  reorderPoolPlayers,
  autoAssignPools,
  generatePoolMatches,
  generateLateMatches,
} from '../api';
import { Pool, Player, Tournament } from '../types';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

export default function PoolsPage({ tournamentId, tournament }: Props) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [unassigned, setUnassigned] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPoolName, setNewPoolName] = useState('');
  const [autoCount, setAutoCount] = useState(4);
  const [generatedPools, setGeneratedPools] = useState<Set<number>>(new Set());
  const [lateGeneratedPools, setLateGeneratedPools] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const [poolRes, regRes] = await Promise.all([
        getPools(tournamentId),
        getRegistrations(tournamentId),
      ]);
      const poolsData: Pool[] = poolRes.data.pools || poolRes.data || [];
      const players: Player[] = regRes.data.players || regRes.data || [];

      const assignedIds = new Set(poolsData.flatMap((p) => p.players.map((pl) => pl.id)));
      const accepted = players.filter(
        (p) => (p.status === 'accepted' || p.status === 'late') && !assignedIds.has(p.id)
      );

      setPools(poolsData);
      setUnassigned(accepted);
    } catch {
      setError('Failed to load pools');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const playerId = Number(draggableId.replace('player-', ''));

    if (source.droppableId === 'unassigned' && destination.droppableId.startsWith('pool-')) {
      const poolId = Number(destination.droppableId.replace('pool-', ''));
      try {
        await addPlayerToPool(tournamentId, poolId, playerId);
        await load();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        setError(e.response?.data?.error || 'Failed to add player to pool');
      }
    } else if (source.droppableId.startsWith('pool-') && destination.droppableId === 'unassigned') {
      const poolId = Number(source.droppableId.replace('pool-', ''));
      try {
        await removePlayerFromPool(tournamentId, poolId, playerId);
        await load();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        setError(e.response?.data?.error || 'Failed to remove player');
      }
    } else if (source.droppableId.startsWith('pool-') && destination.droppableId.startsWith('pool-')) {
      const srcPoolId = Number(source.droppableId.replace('pool-', ''));
      const dstPoolId = Number(destination.droppableId.replace('pool-', ''));
      if (srcPoolId === dstPoolId) {
        // Reorder within same pool
        const pool = pools.find((p) => p.id === srcPoolId);
        if (!pool) return;
        const newPlayers = [...pool.players];
        const [moved] = newPlayers.splice(source.index, 1);
        newPlayers.splice(destination.index, 0, moved);
        try {
          await reorderPoolPlayers(tournamentId, srcPoolId, newPlayers.map((p) => p.id));
          await load();
        } catch {
          setError('Failed to reorder');
        }
      } else {
        // Move between pools
        try {
          await removePlayerFromPool(tournamentId, srcPoolId, playerId);
          await addPlayerToPool(tournamentId, dstPoolId, playerId);
          await load();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e.response?.data?.error || 'Failed to move player');
        }
      }
    }
  };

  const handleCreatePool = async () => {
    if (!newPoolName.trim()) return;
    try {
      await createPool(tournamentId, newPoolName.trim());
      setNewPoolName('');
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to create pool');
    }
  };

  const handleDeletePool = async (poolId: number) => {
    if (!confirm('Delete this pool?')) return;
    try {
      await deletePool(tournamentId, poolId);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to delete pool');
    }
  };

  const handleAutoAssign = async () => {
    try {
      await autoAssignPools(tournamentId, autoCount);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Auto-assign failed');
    }
  };

  const handleGenerateMatches = async (poolId: number) => {
    try {
      await generatePoolMatches(tournamentId, poolId);
      setGeneratedPools((prev) => new Set([...prev, poolId]));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to generate matches');
    }
  };

  const handleGenerateLateMatches = async (poolId: number) => {
    try {
      await generateLateMatches(tournamentId, poolId);
      setLateGeneratedPools((prev) => new Set([...prev, poolId]));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Failed to generate late matches');
    }
  };

  const hasLatePlayersInPool = (pool: Pool) => pool.players.some((p) => p.status === 'late');

  // Suppress unused variable warning for tournament prop
  void tournament;

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="New pool name..."
          value={newPoolName}
          onChange={(e) => setNewPoolName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreatePool()}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreatePool}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          + Add Pool
        </button>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-gray-600">Pool size:</span>
          <select
            value={autoCount}
            onChange={(e) => setAutoCount(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[2, 4, 6, 8].map((n) => (
              <option key={n} value={n}>{n} players/pool</option>
            ))}
          </select>
          <button
            onClick={handleAutoAssign}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition"
          >
            Auto-Assign
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {/* Unassigned Players */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl">
                <h3 className="font-medium text-gray-700 text-sm">Unassigned Players</h3>
                <p className="text-xs text-gray-400">{unassigned.length} players</p>
              </div>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-24 p-2 transition ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                  >
                    {unassigned.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">All players assigned</p>
                    )}
                    {unassigned.map((player, index) => (
                      <Draggable key={player.id} draggableId={`player-${player.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-1 px-3 py-2 rounded-lg text-sm font-medium cursor-grab transition ${
                              snapshot.isDragging ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {player.seed && <span className="text-xs mr-1 opacity-60">#{player.seed}</span>}
                            {player.name}
                            {player.status === 'late' && (
                              <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1 rounded">late</span>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>

          {/* Pools */}
          <div className="flex-1 grid grid-cols-2 gap-4 content-start">
            {pools.length === 0 ? (
              <div className="col-span-2 text-center text-gray-400 py-12 bg-white rounded-xl border">
                No pools yet. Create pools above or use Auto-Assign.
              </div>
            ) : (
              pools.map((pool) => (
                <div key={pool.id} className="bg-white rounded-xl shadow-sm border">
                  <div className="px-4 py-3 border-b bg-gray-50 rounded-t-xl flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-700 text-sm">{pool.name}</h3>
                      <p className="text-xs text-gray-400">{pool.players.length} players</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {generatedPools.has(pool.id) && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Matches ✓</span>
                      )}
                      <button
                        onClick={() => handleGenerateMatches(pool.id)}
                        className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded hover:bg-purple-200 transition"
                      >
                        Gen Matches
                      </button>
                      {hasLatePlayersInPool(pool) && (
                        <button
                          onClick={() => handleGenerateLateMatches(pool.id)}
                          className={`text-xs px-2 py-1 rounded transition ${lateGeneratedPools.has(pool.id) ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                        >
                          {lateGeneratedPools.has(pool.id) ? 'Late ✓' : 'Late Matches'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePool(pool.id)}
                        className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded hover:bg-red-200 transition"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <Droppable droppableId={`pool-${pool.id}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-16 p-2 transition ${snapshot.isDraggingOver ? 'bg-purple-50' : ''}`}
                      >
                        {pool.players.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-3">Drop players here</p>
                        )}
                        {pool.players.map((player, index) => (
                          <Draggable key={player.id} draggableId={`player-${player.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-1 px-3 py-2 rounded-lg text-sm font-medium cursor-grab flex items-center justify-between transition ${
                                  snapshot.isDragging ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <span>
                                  {player.seed && <span className="text-xs mr-1 opacity-60">#{player.seed}</span>}
                                  {player.name}
                                </span>
                                {player.status === 'late' && (
                                  <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">late</span>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
