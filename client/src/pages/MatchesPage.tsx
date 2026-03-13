import React, { useEffect, useState, useCallback } from 'react';
import { getMatches, scheduleMatch, scoreMatch } from '../api';
import { Match, Tournament } from '../types';
import { Calendar, Trophy, Zap, Clock, ChevronRight, Activity, Filter, Settings, Search, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  tournamentId: number;
  tournament: Tournament;
}

type MatchTab = 'pool' | 'bracket' | 'late';

const statusColors: Record<string, string> = {
  scheduled: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  in_progress: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
  completed: 'bg-green-500/10 text-green-400 border border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

export default function MatchesPage({ tournamentId }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<MatchTab>('pool');
  const [scheduleModal, setScheduleModal] = useState<Match | null>(null);
  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scoreForm, setScoreForm] = useState({ score_player1: '', score_player2: '', winner_id: '' });
  const [poolFilter, setPoolFilter] = useState<number | 'all'>('all');

  const load = useCallback(async () => {
    try {
      const res = await getMatches(tournamentId);
      setMatches(res.data.matches || res.data || []);
    } catch {
      setError('Matrix synchronization failure: could not load match data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const poolMatches = matches.filter((m) => m.pool_id !== null && !m.is_late_registration);
  const bracketMatches = matches.filter((m) => m.pool_id === null);
  const lateMatches = matches.filter((m) => m.is_late_registration);

  const pools = Array.from(new Set(poolMatches.map((m) => m.pool_id))).filter(Boolean) as number[];

  const displayed = tab === 'pool'
    ? (poolFilter === 'all' ? poolMatches : poolMatches.filter((m) => m.pool_id === poolFilter))
    : tab === 'bracket' ? bracketMatches : lateMatches;

  const handleSchedule = async () => {
    if (!scheduleModal || !scheduleDate) return;
    try {
      await scheduleMatch(tournamentId, scheduleModal.id, new Date(scheduleDate).toISOString());
      await load();
      setScheduleModal(null);
      setScheduleDate('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Execution failed: temporal offset rejection');
    }
  };

  const handleScore = async () => {
    if (!scoreModal) return;
    try {
      await scoreMatch(tournamentId, scoreModal.id, {
        score_player1: scoreForm.score_player1,
        score_player2: scoreForm.score_player2,
        winner_id: scoreForm.winner_id ? Number(scoreForm.winner_id) : undefined,
      });
      await load();
      setScoreModal(null);
      setScoreForm({ score_player1: '', score_player2: '', winner_id: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Finalization failed: result mismatch');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="animate-spin text-primary-500" size={32} />
      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Compiling Match Records</p>
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

      <div className="space-y-8">
        {/* Navigation & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 overflow-x-auto scrollbar-hide">
            {(['pool', 'bracket', 'late'] as MatchTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {t === 'pool' ? <Zap size={14} /> : t === 'bracket' ? <Trophy size={14} /> : <Clock size={14} />}
                {t === 'pool' ? 'Pool Phase' : t === 'bracket' ? 'Elimination' : 'Late Ingress'}
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${tab === t ? 'bg-white/20' : 'bg-slate-800'}`}>
                  {t === 'pool' ? poolMatches.length : t === 'bracket' ? bracketMatches.length : lateMatches.length}
                </span>
              </button>
            ))}
          </div>

          {tab === 'pool' && pools.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800/50">
              <button
                onClick={() => setPoolFilter('all')}
                className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poolFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'}`}
              >
                Total Matrix
              </button>
              {pools.map((pid) => (
                <button
                  key={pid}
                  onClick={() => setPoolFilter(pid)}
                  className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${poolFilter === pid ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  Sector {pid}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Matches Grid/Table */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden border-slate-800/50">
          {displayed.length === 0 ? (
            <div className="p-24 text-center flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                <Activity className="text-slate-800" size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No match data available in this sector</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800/50">
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Encounter Details</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lifecycle</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Temporal Slot</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Result</th>
                    <th className="text-right px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocols</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {displayed.map((match) => (
                    <tr key={match.id} className="hover:bg-slate-900/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-6">
                          <div className="flex-1 text-right">
                            <div className="text-sm font-black text-white uppercase tracking-tight">{match.player1_name || `UNIT-${match.player1_id}`}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[8px] font-black text-slate-700">VS</div>
                          <div className="flex-1 text-left">
                            <div className="text-sm font-black text-white uppercase tracking-tight">{match.player2_name || (match.player2_id ? `UNIT-${match.player2_id}` : 'PENDING')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Round {match.round}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest w-fit ${statusColors[match.status] || 'bg-slate-800 text-slate-500'}`}>
                            {match.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {match.scheduled_at ? (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <Clock size={12} className="text-primary-500" />
                            {new Date(match.scheduled_at).toLocaleDateString()}
                            <span className="text-slate-600">@</span>
                            {new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">TBD</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        {match.score_player1 || match.score_player2 ? (
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 font-black text-sm text-primary-400 tracking-tighter">
                              {match.score_player1 || '0'} — {match.score_player2 || '0'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-800">—</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => { setScheduleModal(match); setScheduleDate(match.scheduled_at ? match.scheduled_at.slice(0, 16) : ''); }}
                            className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-500 hover:text-yellow-400 rounded-xl transition-all shadow-sm"
                          >
                            <Calendar size={16} />
                          </button>
                          {match.status !== 'completed' && (
                            <button
                              onClick={() => {
                                setScoreModal(match);
                                setScoreForm({
                                  score_player1: match.score_player1 || '',
                                  score_player2: match.score_player2 || '',
                                  winner_id: match.winner_id ? String(match.winner_id) : '',
                                });
                              }}
                              className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-500 hover:text-green-400 rounded-xl transition-all shadow-sm"
                            >
                              <Trophy size={16} />
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
      </div>

      {/* Modals with Premium Styling */}
      <AnimatePresence>
        {scheduleModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-slate-800"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Schedule Sync</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Assigning temporal coordinates</p>
                </div>
                <button onClick={() => setScheduleModal(null)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800/50 mb-8 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{scheduleModal.player1_name || 'UNIT-A'}</span>
                <span className="text-[10px] font-black text-slate-600">VS</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{scheduleModal.player2_name || 'UNIT-B'}</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Temporal Offset</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-white inverted-scheme-date"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setScheduleModal(null)} className="flex-1 px-8 py-4 rounded-2xl bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:bg-slate-800 transition-all">Abort</button>
                  <button onClick={handleSchedule} className="flex-1 px-8 py-4 rounded-2xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-950/40 hover:bg-primary-500 transition-all">Commit Sync</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {scoreModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="glass-card rounded-[3rem] p-10 w-full max-w-lg shadow-2xl border border-slate-800"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">Resolve Encounter</h3>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Finalizing interaction results</p>
                </div>
                <button onClick={() => setScoreModal(null)} className="p-2 text-slate-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4 text-center">
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{scoreModal.player1_name || 'UNIT-A'}</div>
                  <input
                    type="text"
                    placeholder="Sets (e.g. 6)"
                    value={scoreForm.score_player1}
                    onChange={(e) => setScoreForm({ ...scoreForm, score_player1: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-6 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-center placeholder:opacity-10"
                  />
                </div>
                <div className="space-y-4 text-center">
                  <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{scoreModal.player2_name || 'UNIT-B'}</div>
                  <input
                    type="text"
                    placeholder="Sets (e.g. 4)"
                    value={scoreForm.score_player2}
                    onChange={(e) => setScoreForm({ ...scoreForm, score_player2: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-6 text-2xl font-black focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-center placeholder:opacity-10"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Victor Designation</label>
                  <select
                    value={scoreForm.winner_id}
                    onChange={(e) => setScoreForm({ ...scoreForm, winner_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all text-white appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-950">Select winner...</option>
                    {scoreModal.player1_id && <option value={scoreModal.player1_id} className="bg-slate-950">🏆 {scoreModal.player1_name}</option>}
                    {scoreModal.player2_id && <option value={scoreModal.player2_id} className="bg-slate-950">🏆 {scoreModal.player2_name}</option>}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setScoreModal(null)} className="flex-1 px-8 py-4 rounded-2xl bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:bg-slate-800 transition-all">Cancel</button>
                  <button onClick={handleScore} className="flex-1 px-8 py-4 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-green-950/20 hover:bg-green-500 transition-all">Submit Result</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
