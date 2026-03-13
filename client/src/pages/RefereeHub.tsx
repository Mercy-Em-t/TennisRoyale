import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getMatches } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Trophy, Clock, Zap, MapPin, ChevronRight,
    Filter, Search, User, CheckCircle2, AlertTriangle, Shield
} from 'lucide-react';

const RefereeHub = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        try {
            // Simplified: Fetch all active tournaments and their matches
            const res = await getTournaments();
            const tournaments = res.data.tournaments || res.data || [];

            // Get matches for the most recent/active tournaments
            const matchPromises = tournaments.slice(0, 3).map((t: any) => getMatches(t.id));
            const matchResults = await Promise.all(matchPromises);

            let allMatches: any[] = [];
            matchResults.forEach((res, i) => {
                const ms = res.data.matches || res.data || [];
                allMatches = [...allMatches, ...ms.map((m: any) => ({ ...m, tournamentName: tournaments[i].name }))];
            });

            setMatches(allMatches);
        } catch (err) {
            console.error("Failed to load referee data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = matches.filter(m =>
        m.player1_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.player2_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.tournamentName?.toLowerCase().includes(search.toLowerCase())
    );

    const pendingMatches = filtered.filter(m => m.status === 'scheduled');
    const liveMatches = filtered.filter(m => m.status === 'in_progress');

    return (
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-12 pb-32">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                        Referee <span className="gradient-text italic">Hub</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] mt-2 uppercase tracking-[0.3em] ml-1">Official Oversight & Scoring Center</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search active courts..."
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Live Operations */}
            <section className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Zap size={18} className="text-red-500 animate-pulse" /> Live Assignments
                    </h2>
                    <span className="text-[9px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        {liveMatches.length} Assigned
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {liveMatches.length > 0 ? (
                        liveMatches.map((m, i) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card rounded-[2.5rem] p-10 flex flex-col justify-between border-l-4 border-red-500 shadow-2xl relative overflow-hidden group hover:border-red-400 transition-all"
                            >
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest mb-1">{m.tournamentName}</p>
                                            <h3 className="text-2xl font-black text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">
                                                {m.player1_name || 'Unit A'} vs {m.player2_name || 'Unit B'}
                                            </h3>
                                        </div>
                                        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                                            <Activity size={20} />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-600" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Court {m.court || '3'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-slate-600" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elpsd: 42'</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-4">
                                    <Link to={`/tournaments/${m.tournament_id}/score/${m.id}`} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all text-center shadow-xl shadow-red-950/40">
                                        Open Scoring Pad
                                    </Link>
                                    <button className="p-5 bg-slate-900 hover:bg-slate-800 rounded-2xl border border-slate-800 text-slate-500 transition-all">
                                        <AlertTriangle size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full h-48 glass-card rounded-[2.5rem] border-dashed border-2 border-slate-800 flex flex-col items-center justify-center opacity-40 grayscale">
                            <Zap className="text-slate-800 mb-4" size={32} />
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No assigned live matrix nodes</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Pending Stream */}
            <section className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Clock size={18} className="text-primary-500" /> Upcoming Shifts
                    </h2>
                </div>

                <div className="glass-card rounded-[2.5rem] overflow-hidden border border-slate-800/30 shadow-2xl">
                    <div className="divide-y divide-slate-800/40">
                        {pendingMatches.length > 0 ? (
                            pendingMatches.map((m, i) => (
                                <div key={m.id} className="p-8 flex items-center justify-between hover:bg-slate-900/30 transition-all group">
                                    <div className="flex items-center gap-8">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-700 font-black text-xl border border-slate-800 group-hover:border-primary-500/30 group-hover:text-primary-400 transition-all">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{m.tournamentName}</p>
                                            <h4 className="text-lg font-black text-white hover:text-primary-400 transition-colors uppercase tracking-tight">
                                                {m.player1_name} vs {m.player2_name || 'TBD'}
                                            </h4>
                                            <p className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-tighter">Round {m.round} | Court {m.court || 'TBD'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-white tracking-widest">{new Date(m.scheduled_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Start Time</p>
                                        </div>
                                        <button onClick={() => navigate(`/tournaments/${m.tournament_id}/score/${m.id}`)} className="p-4 bg-primary-500/10 hover:bg-primary-500 text-primary-400 hover:text-white rounded-2xl border border-primary-500/20 transition-all">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-20 text-center text-slate-700 font-black text-[10px] uppercase tracking-widest italic opacity-40">
                                Match stream currently dry
                            </div>
                        )}
                    </div>
                </div>
            </section>

        </div>
    );
};

export default RefereeHub;
