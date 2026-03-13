import React, { useEffect, useState, useCallback } from 'react';
import {
  getRegistrations,
  acceptRegistration,
  rejectRegistration,
  setSeed,
  submitRegistration,
} from '../api';
import { Player, Tournament } from '../types';
import { UserPlus, UserCheck, UserX, Star, Search, Filter, Mail, Phone, MoreHorizontal, User, AlertCircle, Loader2, Plus, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
      setError('Matrix communication failure: could not load roster');
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
      setError(e.response?.data?.error || 'Authorization failed: could not accept entry');
    }
  };

  const handleReject = async (playerId: number) => {
    try {
      await rejectRegistration(tournamentId, playerId);
      await load();
      onRefresh?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Authorization failed: could not reject entry');
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
      setError(e.response?.data?.error || 'Seed allocation failed');
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
      setError(e.response?.data?.error || 'Manual injection failed');
    } finally {
      setAdding(false);
    }
  };

  const filtered = players.filter((p) => filter === 'all' || p.status === filter);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      accepted: 'bg-green-500/10 text-green-400 border border-green-500/20',
      rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
      late: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      withdrawn: 'bg-slate-800 text-slate-500',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${map[status] || 'bg-slate-800 text-slate-500'}`}>
        {status}
      </span>
    );
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
    <div className="space-y-8">
      {canRegister && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-600/10 border border-primary-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center text-primary-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">Registration Inbound Active</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Source ID: <span className="text-primary-400">{tournamentId}</span></p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            Copy Entry Link
          </button>
        </motion.div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 overflow-x-auto scrollbar-hide">
            {(['all', 'pending', 'accepted', 'rejected', 'late'] as FilterTab[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f} <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${filter === f ? 'bg-white/20' : 'bg-slate-800'}`}>{filterCounts[f]}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddPlayer(true)}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl"
          >
            <Plus size={16} /> Inject Player
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="glass-card rounded-[2.5rem] overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-primary-500" size={32} />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Scanning Database</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                <User className="text-slate-800" size={24} />
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No roster entries detected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800/50">
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player Identity</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact Signal</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Matrix Status</th>
                    <th className="text-left px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Seed Position</th>
                    <th className="text-right px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocols</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {filtered.map((player) => (
                    <tr key={player.id} className="hover:bg-slate-900/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs font-black text-slate-60) group-hover:border-primary-500/30 transition-colors capitalize">
                            {player.name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight">{player.name}</div>
                            <div className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">ID: {player.id.toString().padStart(6, '0')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <Mail size={12} className="text-slate-600" /> {player.email}
                          </div>
                          {player.phone && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                              <Phone size={12} className="text-slate-600" /> {player.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {statusBadge(player.status)}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            placeholder={player.seed !== null ? String(player.seed) : '--'}
                            value={seedInputs[player.id] ?? (player.seed !== null ? String(player.seed) : '')}
                            onChange={(e) => setSeedInputs({ ...seedInputs, [player.id]: e.target.value })}
                            className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[10px] font-black focus:ring-1 focus:ring-primary-500 outline-none transition-all text-center"
                            min={1}
                          />
                          {seedInputs[player.id] !== undefined && (
                            <button
                              onClick={() => handleSetSeed(player.id)}
                              className="w-8 h-8 bg-primary-600/10 hover:bg-primary-600 border border-primary-500/20 rounded-lg flex items-center justify-center text-primary-400 hover:text-white transition-all"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-2">
                          {player.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAccept(player.id)}
                                className="px-4 py-2 bg-green-500/10 hover:bg-green-600 border border-green-500/20 text-green-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                Validate
                              </button>
                              <button
                                onClick={() => handleReject(player.id)}
                                className="px-4 py-2 bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {player.status === 'accepted' && (
                            <button
                              onClick={() => handleReject(player.id)}
                              className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                              title="Revoke status"
                            >
                              <UserX size={18} />
                            </button>
                          )}
                          {player.status === 'rejected' && (
                            <button
                              onClick={() => handleAccept(player.id)}
                              className="p-2 text-slate-600 hover:text-green-400 transition-colors"
                              title="Re-validate"
                            >
                              <UserCheck size={18} />
                            </button>
                          )}
                          <button className="p-2 text-slate-600 hover:text-white transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
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

      {/* Inject Player Modal */}
      <AnimatePresence>
        {showAddPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card rounded-[3rem] p-10 w-full max-w-md shadow-2xl border border-slate-800"
            >
              <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Inject Player</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Manual entry bypass protocol</p>

              <form onSubmit={handleAddPlayer} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Legal Name</label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="Player name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all placeholder:text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Email Signal</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="email@venue.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all placeholder:text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Link</label>
                  <input
                    type="text"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+254..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all placeholder:text-slate-800"
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddPlayer(false)}
                    className="flex-1 px-8 py-4 rounded-2xl bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 px-8 py-4 rounded-2xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-950/40 hover:bg-primary-500 transition-all flex items-center justify-center"
                  >
                    {adding ? <Loader2 className="animate-spin" size={20} /> : 'Inject Player'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
