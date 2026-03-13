import React, { useEffect, useState, useCallback } from 'react';
import { getBracket, generateBracket, advanceBracket } from '../api';
import { BracketMatch, Tournament } from '../types';
import { Trophy, ChevronRight, Zap, Target, MoreVertical, X, Share2, Download, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

export default function BracketPage({ tournamentId, tournament }: Props) {
  const [rounds, setRounds] = useState<Record<number, BracketMatch[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [advanceModal, setAdvanceModal] = useState<BracketMatch | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getBracket(tournamentId);
      setRounds(res.data.rounds || {});
    } catch {
      setError('Matrix synchronization failure: could not load bracket data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      await generateBracket(tournamentId);
      await load();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Algorithmic failure: bracket expansion rejected');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvance = async (winnerId: number) => {
    if (!advanceModal) return;
    try {
      await advanceBracket(tournamentId, advanceModal.match_id, winnerId);
      await load();
      setAdvanceModal(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Advancement protocol rejected');
    }
  };

  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);
  const maxRound = Math.max(...roundNumbers, 0);
  const bracketEmpty = roundNumbers.length === 0;

  const getRoundLabel = (round: number) => {
    if (round === maxRound) return 'Championship';
    if (round === maxRound - 1) return 'Final Four';
    if (round === maxRound - 2) return 'Elite Eight';
    return `Series Phase ${round}`;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={32} />
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Rendering Bracket Topology</p>
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

      {/* Control Banner */}
      <div className="glass-card rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 border-slate-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center text-primary-400">
            <Target size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight">Tournament Tree</h2>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Single-Elimination Logic Active</p>
          </div>
        </div>

        {tournament.status === 'in_progress' && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full md:w-auto bg-primary-600 hover:bg-primary-500 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-950/40 flex items-center justify-center gap-3"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            Initialize Bracket
          </button>
        )}
      </div>

      {bracketEmpty ? (
        <div className="p-32 glass-card rounded-[3rem] text-center border-dashed border-slate-800 flex flex-col items-center justify-center gap-8">
          <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
            <Trophy size={24} className="text-slate-800" />
          </div>
          {tournament.status === 'in_progress' ? (
            <div>
              <p className="text-white font-black uppercase tracking-widest text-sm mb-2">Topology Undefined</p>
              <p className="text-slate-600 font-bold text-xs">Activate the "Initialize Bracket" protocol to build the elimination tree.</p>
            </div>
          ) : (
            <p className="text-slate-600 font-bold text-xs uppercase tracking-[0.2em]">Bracket unavailable until event activation.</p>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-[3rem] p-10 overflow-x-auto scrollbar-hide">
          <div className="flex gap-16 min-w-max">
            {roundNumbers.map((round) => (
              <div key={round} className="flex flex-col gap-10" style={{ minWidth: '280px' }}>
                <div className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em] text-center">
                    {getRoundLabel(round)}
                  </h3>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                </div>

                <div className="flex flex-col justify-around flex-1 gap-12">
                  {rounds[round].map((bm) => {
                    const match = bm.match;
                    const isCompleted = match.status === 'completed';
                    const canAdvance = isCompleted && !match.winner_id && tournament.status === 'in_progress';
                    const winner = match.winner_id;

                    return (
                      <motion.div
                        key={bm.id}
                        layout
                        className="relative group"
                      >
                        <div className="glass-card rounded-2xl overflow-hidden border-slate-800/80 hover:border-primary-500/30 transition-all shadow-xl">
                          {/* Player 1 Slot */}
                          <div className={`px-5 py-4 flex items-center justify-between ${winner === match.player1_id ? 'bg-primary-500/10' : 'bg-slate-950/20'} border-b border-slate-900`}>
                            <div className="flex items-center gap-3 truncate">
                              <div className={`w-1.5 h-1.5 rounded-full ${winner === match.player1_id ? 'bg-primary-500 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-slate-800'}`} />
                              <span className={`text-[11px] font-black uppercase tracking-widest truncate ${winner === match.player1_id ? 'text-white' : 'text-slate-500'}`}>
                                {match.player1_name || 'PENDING'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-black text-slate-400">{match.score_player1 || '—'}</span>
                          </div>

                          {/* Player 2 Slot */}
                          <div className={`px-5 py-4 flex items-center justify-between ${winner === match.player2_id ? 'bg-primary-500/10' : 'bg-slate-950/20'}`}>
                            <div className="flex items-center gap-3 truncate">
                              <div className={`w-1.5 h-1.5 rounded-full ${winner === match.player2_id ? 'bg-primary-500 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]' : 'bg-slate-800'}`} />
                              <span className={`text-[11px] font-black uppercase tracking-widest truncate ${winner === match.player2_id ? 'text-white' : 'text-slate-500'}`}>
                                {match.player2_name || 'PENDING'}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] font-black text-slate-400">{match.score_player2 || '—'}</span>
                          </div>

                          {/* Advancement Curation */}
                          <AnimatePresence>
                            {canAdvance && (
                              <motion.div
                                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                className="bg-slate-900/50 border-t border-slate-800 overflow-hidden"
                              >
                                <button
                                  onClick={() => setAdvanceModal(bm)}
                                  className="w-full py-2.5 text-[8px] font-black text-primary-400 uppercase tracking-[0.3em] hover:bg-primary-500 hover:text-white transition-all"
                                >
                                  Advancement Protocol Required
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Connection Lines (Desktop Only) */}
                        {round < maxRound && (
                          <div className="hidden md:block absolute -right-16 top-1/2 -translate-y-1/2 w-16 h-px bg-slate-800/50" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advance Modal with Premium Styling */}
      <AnimatePresence>
        {advanceModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card rounded-[3rem] p-10 w-full max-w-sm shadow-2xl border border-slate-800 text-center"
            >
              <Trophy className="text-primary-500 mx-auto mb-6" size={48} />
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Crown Victor</h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-10">Select units to advance to the next sector</p>

              <div className="space-y-3">
                {[
                  { id: advanceModal.match.player1_id, name: advanceModal.match.player1_name },
                  { id: advanceModal.match.player2_id, name: advanceModal.match.player2_name }
                ].map((p) => p.id && (
                  <button
                    key={p.id}
                    onClick={() => handleAdvance(p.id!)}
                    className="w-full bg-slate-900 hover:bg-primary-600 border border-slate-800 hover:border-primary-500 rounded-2xl px-8 py-5 text-center transition-all group"
                  >
                    <span className="text-xs font-black text-slate-300 group-hover:text-white uppercase tracking-widest">
                      {p.name || `UNIT-${p.id}`}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAdvanceModal(null)}
                className="w-full mt-8 py-4 text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
              >
                Abort Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
