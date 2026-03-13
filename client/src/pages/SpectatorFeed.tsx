import React, { useState, useEffect } from 'react';
import { getTournaments, getMatches } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Swords, MessageSquare, Trophy,
    Share2, Heart, Users, Zap, Search, Bell,
    ChevronRight
} from 'lucide-react';

const SpectatorFeed = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'live' | 'completed'>('all');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getTournaments();
                const tournaments = res.data.tournaments || res.data || [];
                const matchPromises = tournaments.slice(0, 2).map((t: any) => getMatches(t.id));
                const results = await Promise.all(matchPromises);
                let all: any[] = [];
                results.forEach((r, i) => {
                    const ms = r.data.matches || r.data || [];
                    all = [...all, ...ms.map((m: any) => ({ ...m, tournamentName: tournaments[i].name }))];
                });
                setMatches(all);
            } catch (err) {
                console.error("Transmission failure:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    const filtered = matches.filter(m => {
        if (filter === 'live') return m.status === 'in_progress';
        if (filter === 'completed') return m.status === 'completed';
        return true;
    });

    if (loading) return (
        <div className="py-20 text-center text-slate-700 font-black uppercase tracking-[0.5em] italic animate-pulse">
            Broadcasting Real-Time Feed...
        </div>
    );

    return (
        <div className="max-w-xl mx-auto px-6 py-8 md:py-12 space-y-12 pb-32">

            {/* Header Area */}
            <header className="flex flex-col gap-8">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none italic">
                        Live <span className="gradient-text">Stream</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.4em] mt-2">Global Match Transmission Hub</p>
                </div>

                <div className="bg-slate-900/50 p-1.5 rounded-[2rem] border border-slate-800 flex overflow-x-auto scrollbar-hide">
                    {['all', 'live', 'completed'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`flex-1 py-4 px-6 rounded-2xl font-black text-[9px] uppercase tracking-widest whitespace-nowrap transition-all ${filter === f ? 'bg-primary-600 text-white shadow-xl' : 'text-slate-600 hover:text-white'}`}
                        >
                            {f === 'all' ? 'Entire Draw' : f === 'live' ? 'Signals Live' : 'Resolved'}
                        </button>
                    ))}
                </div>
            </header>

            {/* Live Feed Stream */}
            <div className="space-y-8">
                {filtered.length > 0 ? (
                    filtered.map((match, i) => (
                        <motion.div
                            key={match.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass-card rounded-[3rem] p-8 border border-slate-900 hover:border-primary-500/20 transition-all shadow-2xl relative overflow-hidden group"
                        >
                            {/* Live Badge */}
                            {match.status === 'in_progress' && (
                                <div className="absolute top-0 right-0 p-8">
                                    <span className="flex items-center gap-2 text-[9px] font-black text-red-400 bg-red-950/30 px-4 py-1.5 rounded-full border border-red-950/50 uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" />
                                        Transmitting
                                    </span>
                                </div>
                            )}

                            <div className="space-y-8">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-1 italic">{match.tournamentName}</p>
                                    <h3 className="text-2xl font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tighter">Court {match.court || 'Center'}</h3>
                                </div>

                                <div className="flex items-center gap-8 justify-between h-24">
                                    <div className="flex-1 text-center space-y-3">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl font-black text-white mx-auto shadow-xl">
                                            {match.player1_name?.[0] || 'A'}
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tight truncate">{match.player1_name || 'Unit A'}</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="bg-slate-950 px-6 py-2 rounded-2xl border border-slate-800 font-black text-3xl text-white italic tracking-tighter shadow-inner">
                                            {match.score_player1 || 0} : {match.score_player2 || 0}
                                        </div>
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Sets Distribution</span>
                                    </div>

                                    <div className="flex-1 text-center space-y-3">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl font-black text-white mx-auto shadow-xl">
                                            {match.player2_name?.[0] || 'B'}
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tight truncate">{match.player2_name || 'Unit B'}</p>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-900 flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <button className="flex items-center gap-2 text-slate-600 hover:text-primary-400 transition-all">
                                            <Heart size={18} />
                                            <span className="text-[10px] font-black">2.4k</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-slate-600 hover:text-primary-400 transition-all">
                                            <Users size={18} />
                                            <span className="text-[10px] font-black">Bet Alpha</span>
                                        </button>
                                    </div>
                                    <button className="p-3 bg-slate-900 hover:bg-slate-800 rounded-xl text-slate-500 transition-all border border-slate-900">
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center space-y-6 opacity-30 grayscale py-20 bg-slate-900/40 rounded-[3rem] border-dashed border-2 border-slate-800">
                        <Zap size={40} className="text-slate-700" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Signal Interference: No matches active</p>
                    </div>
                )}
            </div>

            {/* Global Chat Overlay Pin */}
            <div className="glass-card rounded-[2.5rem] p-8 flex items-center gap-6 bg-primary-600/10 border-primary-500/20">
                <div className="p-4 bg-primary-600 rounded-2xl text-white shrink-0">
                    <MessageSquare size={24} />
                </div>
                <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">Global Signal Channel</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Interact with 1.2k active spectators</p>
                </div>
                <button className="ml-auto p-3 bg-slate-950 border border-slate-800 rounded-xl text-primary-400 hover:text-white transition-all">
                    <ChevronRight size={20} />
                </button>
            </div>

        </div>
    );
};

export default SpectatorFeed;
