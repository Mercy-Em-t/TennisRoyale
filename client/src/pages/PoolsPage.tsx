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
import { Plus, Trash2, Zap, Users, Shield, Wand2, ChevronRight, GripVertical, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

export default function PoolsPage({ tournamentId, tournament: _tournament }: Props) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [unassigned, setUnassigned] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPoolName, setNewPoolName] = useState('');
  const [autoCount, setAutoCount] = useState(4);
  const [generatedPools, setGeneratedPools] = useState<Set<number>>(new Set());
  const [lateGeneratedPools, setLateGeneratedPools] = useState<Set<number>>(new Set());
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

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
      setError('Matrix synchronization failure: could not load pools');
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
        setError(e.response?.data?.error || 'Injection failed');
      }
    } else if (source.droppableId.startsWith('pool-') && destination.droppableId === 'unassigned') {
      const poolId = Number(source.droppableId.replace('pool-', ''));
      try {
        await removePlayerFromPool(tournamentId, poolId, playerId);
        await load();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        setError(e.response?.data?.error || 'Extraction failed');
      }
    } else if (source.droppableId.startsWith('pool-') && destination.droppableId.startsWith('pool-')) {
      const srcPoolId = Number(source.droppableId.replace('pool-', ''));
      const dstPoolId = Number(destination.droppableId.replace('pool-', ''));
      if (srcPoolId === dstPoolId) {
        const pool = pools.find((p) => p.id === srcPoolId);
        if (!pool) return;
        const newPlayers = [...pool.players];
        const [moved] = newPlayers.splice(source.index, 1);
        newPlayers.splice(destination.index, 0, moved);
        try {
          await reorderPoolPlayers(tournamentId, srcPoolId, newPlayers.map((p) => p.id));
          await load();
        } catch {
          setError('Reordering failed');
        }
      } else {
        try {
          await removePlayerFromPool(tournamentId, srcPoolId, playerId);
          await addPlayerToPool(tournamentId, dstPoolId, playerId);
          await load();
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e.response?.data?.error || 'Inter-pool transfer failed');
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
      setError(e.response?.data?.error || 'Pool initialization failed');
    }
  };

  const handleDeletePool = async (poolId: number) => {
    try {
      await deletePool(tournamentId, poolId);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Pool decommissioning failed');
    }
  };

  const handleAutoAssign = async () => {
    setIsAutoAssigning(true);
    try {
      await autoAssignPools(tournamentId, autoCount);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Algorithmic distribution failed');
    } finally {
      setIsAutoAssigning(false);
    }
  };

  const handleGenerateMatches = async (poolId: number) => {
    try {
      await generatePoolMatches(tournamentId, poolId);
      setGeneratedPools((prev) => new Set([...prev, poolId]));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Round-robin generation failed');
    }
  };

  const handleGenerateLateMatches = async (poolId: number) => {
    try {
      await generateLateMatches(tournamentId, poolId);
      setLateGeneratedPools((prev) => new Set([...prev, poolId]));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Late injector protocols failed');
    }
  };

  const hasLatePlayersInPool = (pool: Pool) => pool.players.some((p) => p.status === 'late');

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={32} />
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Loading Pool Matrix</p>
    </div>
  );

  return (
    <div className="space-y-10">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
        >
          <AlertCircle size={14} /> {error}
        </motion.div>
      )}

      {/* Control Panel */}
      <div className="glass-card rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6 border-slate-800/50">
        <div className="flex-1 flex items-center gap-4 w-full">
          <div className="relative flex-1">
            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input
              type="text"
              placeholder="Sector designation (e.g. Group A)..."
              value={newPoolName}
              onChange={(e) => setNewPoolName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePool()}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs font-black focus:outline-none focus:ring-1 focus:ring-primary-600 transition-all placeholder:text-slate-800"
            />
          </div>
          <button
            onClick={handleCreatePool}
            className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-950/30 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={16} /> Initialize Pool
          </button>
        </div>

        <div className="w-full md:w-px h-px md:h-12 bg-slate-800/50" />

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center gap-2 px-4 py-1">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Density:</span>
            <select
              value={autoCount}
              onChange={(e) => setAutoCount(Number(e.target.value))}
              className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest py-3 focus:outline-none cursor-pointer"
            >
              {[2, 4, 6, 8].map((n) => (
                <option key={n} value={n} className="bg-slate-900">{n} Units/Sector</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAutoAssign}
            disabled={isAutoAssigning}
            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-950/30 flex items-center justify-center gap-2"
          >
            {isAutoAssigning ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Auto-Matrix
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Unassigned System Roster */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="glass-card rounded-[2.5rem] overflow-hidden border-slate-800/50 sticky top-[100px]">
              <div className="px-8 py-6 border-b border-slate-800/50 bg-slate-950/30 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Spare Units</h3>
                  <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{unassigned.length} Pending Allocation</p>
                </div>
                <Users size={16} className="text-slate-700" />
              </div>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] p-4 space-y-2 transition-all ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                  >
                    {unassigned.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-20">
                        <CheckCircle2 size={32} />
                        <p className="text-[10px] font-black uppercase tracking-widest">Roster Clear</p>
                      </div>
                    )}
                    {unassigned.map((player, index) => (
                      <Draggable key={player.id} draggableId={`player-${player.id}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`group px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 border shadow-sm ${snapshot.isDragging
                                ? 'bg-primary-600 text-white border-primary-500 shadow-2xl scale-[1.02] rotate-1'
                                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-900 group-hover:text-white'
                              }`}
                          >
                            <GripVertical size={14} className="text-slate-700 group-hover:text-slate-500" />
                            <div className="flex-1 truncate">
                              {player.seed && <span className="text-primary-500 mr-2 text-[10px]">#{player.seed}</span>}
                              {player.name}
                            </div>
                            {player.status === 'late' && (
                              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] rounded-md border border-indigo-500/20">LATE</span>
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

          {/* Active Pool Sectors */}
          <div className="flex-1">
            {pools.length === 0 ? (
              <div className="p-32 glass-card rounded-[3rem] text-center border-dashed border-slate-800 flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                  <Layers size={24} className="text-slate-800" />
                </div>
                <div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Matrix Sectors Undefined</h4>
                  <p className="text-slate-600 font-bold text-xs">Initialize groups or use algorithm to start distribution.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence>
                  {pools.map((pool) => (
                    <motion.div
                      key={pool.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card rounded-[2.5rem] overflow-hidden border-slate-800/50 flex flex-col"
                    >
                      <div className="px-8 py-6 border-b border-slate-800/50 bg-slate-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">{pool.name}</h3>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                            <Users size={10} /> {pool.players.length} Units Contained
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {generatedPools.has(pool.id) ? (
                            <div className="px-3 py-1.5 bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-green-500/20">
                              SYNCHRONIZED
                            </div>
                          ) : (
                            <button
                              onClick={() => handleGenerateMatches(pool.id)}
                              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-primary-500 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                              <Zap size={10} /> Gen Matches
                            </button>
                          )}

                          {hasLatePlayersInPool(pool) && (
                            <button
                              onClick={() => handleGenerateLateMatches(pool.id)}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${lateGeneratedPools.has(pool.id) ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white'}`}
                            >
                              {lateGeneratedPools.has(pool.id) ? 'LATE INJECTED' : 'INJECT LATE'}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeletePool(pool.id)}
                            className="p-2 text-slate-700 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <Droppable droppableId={`pool-${pool.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[120px] p-6 space-y-3 transition-all ${snapshot.isDraggingOver ? 'bg-indigo-500/5' : ''}`}
                          >
                            {pool.players.length === 0 && (
                              <div className="py-10 border-2 border-dashed border-slate-900 rounded-3xl flex items-center justify-center">
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Awaiting Injection</p>
                              </div>
                            )}
                            {pool.players.map((player, index) => (
                              <Draggable key={player.id} draggableId={`player-${player.id}`} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`group px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-between transition-all border ${snapshot.isDragging
                                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-2xl scale-[1.05] z-50'
                                        : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:border-slate-800'
                                      }`}
                                  >
                                    <div className="flex items-center gap-4 truncate">
                                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black transition-colors group-hover:border-primary-500/30 group-hover:text-primary-400">
                                        {index + 1}
                                      </div>
                                      <span className="truncate">
                                        {player.seed && <span className="text-primary-500 mr-2">#{player.seed}</span>}
                                        {player.name}
                                      </span>
                                    </div>
                                    {player.status === 'late' && (
                                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] rounded-md border border-indigo-500/20 font-black">
                                        <Shield size={8} /> LATE
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
