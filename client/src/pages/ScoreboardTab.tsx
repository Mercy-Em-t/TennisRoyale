import React, { useEffect, useState, useCallback } from 'react';
import { getMatches } from '../api';
import { Match } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Activity, Clock } from 'lucide-react';

export default function ScoreboardTab({ tournamentId }: { tournamentId: number }) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await getMatches(tournamentId);
            setMatches(res.data.matches || res.data || []);
        } catch (err) {
            console.error('Failed to load scoreboard:', err);
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    useEffect(() => { load(); }, [load]);

    const liveMatches = matches.filter(m => m.status === 'in_progress');
    const completedMatches = matches.filter(m => m.status === 'completed').slice(0, 10);

    if (loading) return (
        <div className="py-20 text-center text-slate-600 animate-pulse font-black uppercase tracking-widest italic">
            Synchronizing Score Matrix...
        </div>
    );

    return (
        <div className="space-y-12">
            {/* Live Board */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Activity size={18} className="text-red-500 animate-pulse" /> Live Encounters
                    </h2>
                    <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        {liveMatches.length} Live
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {liveMatches.length > 0 ? (
                        liveMatches.map((m, i) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card rounded-[2.5rem] p-10 border-l-4 border-red-500 shadow-2xl relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="flex items-center gap-1.5 text-[8px] font-black text-red-400 bg-red-950/20 border border-red-800/40 rounded-full px-3 py-1 uppercase">
                                        <Activity size={10} className="fill-red-400" /> Live
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-8 h-full">
                                    <div className="flex-1 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-2xl font-black text-white shadow-xl border border-slate-800">
                                            {m.player1_name?.[0].toUpperCase() || 'A'}
                                        </div>
                                        <p className="font-black text-sm text-white uppercase tracking-tight">{m.player1_name || 'UNIT-A'}</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="px-6 py-2 bg-slate-950 rounded-2xl border border-slate-800 font-black text-3xl text-primary-400 tracking-tighter shadow-2xl">
                                            {m.score_player1 || 0} : {m.score_player2 || 0}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Sets Distribution</span>
                                    </div>

                                    <div className="flex-1 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-2xl font-black text-white shadow-xl border border-slate-800">
                                            {m.player2_name?.[0].toUpperCase() || 'B'}
                                        </div>
                                        <p className="font-black text-sm text-white uppercase tracking-tight">{m.player2_name || 'UNIT-B'}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full h-48 glass-card rounded-[2rem] border-dashed border-2 border-slate-800 flex flex-col items-center justify-center opacity-40 grayscale">
                            <Activity className="text-slate-800 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No active matrix pings</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Recent Results */}
            <section className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Trophy size={18} className="text-yellow-500" /> Resolved Matches
                    </h2>
                </div>

                <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-800/30">
                    <div className="divide-y divide-slate-800/50">
                        {completedMatches.map((m, i) => (
                            <div key={m.id} className="p-8 flex items-center justify-between hover:bg-slate-900/30 transition-all group">
                                <div className="flex items-center gap-10 flex-1">
                                    <div className="flex-1 text-right flex flex-col items-end">
                                        <p className={`font-black text-sm uppercase tracking-tight ${m.winner_id === m.player1_id ? 'text-primary-400' : 'text-slate-400'}`}>{m.player1_name || 'UNIT-A'}</p>
                                        {m.winner_id === m.player1_id && <span className="text-[8px] font-black text-yellow-500/70 uppercase tracking-widest mt-1">Victor</span>}
                                    </div>
                                    <div className="px-5 py-1.5 bg-slate-950 rounded-xl border border-slate-900 font-black text-lg text-white group-hover:border-primary-500/30 transition-all">
                                        {m.score_player1} - {m.score_player2}
                                    </div>
                                    <div className="flex-1 text-left flex flex-col items-start">
                                        <p className={`font-black text-sm uppercase tracking-tight ${m.winner_id === m.player2_id ? 'text-primary-400' : 'text-slate-400'}`}>{m.player2_name || 'UNIT-B'}</p>
                                        {m.winner_id === m.player2_id && <span className="text-[8px] font-black text-yellow-500/70 uppercase tracking-widest mt-1">Victor</span>}
                                    </div>
                                </div>
                                <div className="ml-10 text-right shrink-0">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 flex items-center gap-2 justify-end">
                                        <Clock size={10} /> {new Date(m.scheduled_at || '').toLocaleDateString()}
                                    </p>
                                    <span className="text-[8px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-500 font-black uppercase tracking-tighter">Verified</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
