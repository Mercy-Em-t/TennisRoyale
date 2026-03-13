import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, PlayCircle, Award, ChevronRight, Globe, Lock,
    Users, Zap, MapPin, Hash, KeyRound, Trophy, TrendingUp
} from 'lucide-react';
import JoinTournament from '../components/JoinTournament';

const Lobby = () => {
    const { currentUser, userRole } = useAuth();
    const [publicTournaments, setPublicTournaments] = useState([]);
    const [showJoin, setShowJoin] = useState(false);
    const [loadingTournaments, setLoadingTournaments] = useState(true);

    /* Demo upcoming matches (would come from Firestore in production) */
    const upcomingMatches = [
        { id: '1', opponent: 'Roger Federer', time: '14:30', court: 'Center Court', tournament: 'Summer Open' },
        { id: '2', opponent: 'Rafael Nadal', time: '16:00', court: 'Court 1', tournament: 'Summer Open' },
    ];

    useEffect(() => {
        const q = query(
            collection(db, 'tournaments'),
            where('visibility', '==', 'public'),
            where('status', '==', 'registration'),
            limit(6)
        );
        const unsub = onSnapshot(q, snap => {
            setPublicTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingTournaments(false);
        }, () => setLoadingTournaments(false));
        return () => unsub();
    }, []);

    /* Format label helpers */
    const formatLabel = f => ({ round_robin: 'Round Robin', knockout: 'Knockout', hybrid: 'Hybrid' }[f] || f);
    const scoringLabel = s => ({ short_set: 'Short Sets', full_set: 'Full Sets', knockout_7: 'To 7', knockout_11: 'To 11' }[s] || s);

    return (
        <>
            <div className="space-y-10">
                {/* Hero */}
                <section className="relative glass rounded-3xl p-8 overflow-hidden bg-gradient-to-br from-primary-900/40 to-slate-900">
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-4xl font-black mb-2">
                            Hello, <span className="gradient-text">{currentUser?.displayName || 'Player One'}</span>
                        </h2>
                        <p className="text-slate-300 text-lg mb-6">
                            Your next match is in <span className="text-primary-400 font-bold">2 hours</span>. Warm up and get ready.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <button className="bg-primary-500 hover:bg-primary-400 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all">
                                <PlayCircle size={20} /> Match Center
                            </button>
                            <button
                                onClick={() => setShowJoin(true)}
                                className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold border border-slate-700 flex items-center gap-2 transition-all"
                            >
                                <KeyRound size={20} /> Join with Code
                            </button>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 w-80 h-80 bg-primary-500/10 blur-[120px] rounded-full pointer-events-none" />
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left – Matches + Discovery */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Upcoming Matches */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Calendar className="text-primary-400" /> Upcoming Matches
                                </h3>
                                <span className="text-xs text-slate-500 hover:text-primary-400 cursor-pointer">Full Schedule →</span>
                            </div>
                            <div className="space-y-3">
                                {upcomingMatches.map((match, i) => (
                                    <motion.div
                                        key={match.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="glass-card hover:border-primary-500/50 p-5 rounded-2xl flex items-center justify-between transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="text-center bg-slate-800 rounded-xl p-3 min-w-[64px]">
                                                <p className="text-[10px] text-slate-500 uppercase">Court</p>
                                                <p className="text-lg font-black text-primary-400">{match.court.split(' ').pop()}</p>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold">vs {match.opponent}</h4>
                                                <p className="text-sm text-slate-500">{match.tournament} · {match.time}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-slate-600 group-hover:text-primary-400 transition-colors" size={22} />
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        {/* Open Tournaments Discovery */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Globe className="text-primary-400" /> Open Tournaments
                                </h3>
                                <button
                                    onClick={() => setShowJoin(true)}
                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
                                >
                                    <Hash size={12} /> Join by Code
                                </button>
                            </div>

                            {loadingTournaments ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="glass-card p-5 rounded-2xl animate-pulse space-y-3">
                                            <div className="h-4 bg-slate-700 rounded w-3/4" />
                                            <div className="h-3 bg-slate-800 rounded w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : publicTournaments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {publicTournaments.map((t, i) => (
                                        <motion.div
                                            key={t.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="glass-card p-5 rounded-2xl space-y-3 hover:border-primary-500/40 transition-all cursor-pointer group"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="font-bold leading-tight group-hover:text-primary-400 transition-colors">{t.name}</h4>
                                                <span className="shrink-0 bg-green-900/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Open</span>
                                            </div>
                                            <div className="text-xs text-slate-500 space-y-1">
                                                <p className="flex items-center gap-1.5"><MapPin size={11} /> {t.venue}</p>
                                                <p className="flex items-center gap-1.5"><Trophy size={11} /> {formatLabel(t.format)}</p>
                                                <p className="flex items-center gap-1.5"><Users size={11} /> Max {t.maxPlayers} players</p>
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <span className="text-[10px] bg-slate-800 rounded-full px-2 py-0.5 text-slate-400">{scoringLabel(t.scoringFormat)}</span>
                                                <span className="text-[10px] bg-slate-800 rounded-full px-2 py-0.5 text-slate-400">{t.visibility === 'public' ? '🌐 Public' : '🔒 Private'}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="glass-card p-10 rounded-3xl text-center text-slate-500">
                                    <Globe size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-bold">No open tournaments yet</p>
                                    <p className="text-sm mt-1">Connect Firebase to see live tournaments, or use a join code.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right – Stats */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Award className="text-primary-400" /> Your Season
                        </h3>

                        <div className="glass-card p-6 rounded-2xl space-y-4">
                            {[
                                ['Current Rank', '#12', 'text-accent'],
                                ['Win Rate', '78%', 'text-primary-400'],
                                ['Matches Played', '45', 'text-white'],
                                ['Tournaments Won', '3', 'text-accent'],
                            ].map(([label, val, color]) => (
                                <div key={label} className="flex justify-between items-center py-2 border-b border-slate-700/40 last:border-0">
                                    <span className="text-slate-400 text-sm">{label}</span>
                                    <span className={`text-2xl font-black ${color}`}>{val}</span>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl p-5 bg-indigo-600/10 border border-indigo-500/20 space-y-2">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                                <TrendingUp size={14} /> Global Leaderboard
                            </div>
                            <p className="text-sm text-slate-300">You are in the <strong className="text-indigo-400">top 5%</strong> of players this season!</p>
                        </div>

                        <div className="rounded-2xl p-5 bg-primary-900/20 border border-primary-800/20 space-y-2">
                            <div className="flex items-center gap-2 text-primary-400 font-bold text-xs uppercase tracking-wider">
                                <Zap size={14} /> Quick Actions
                            </div>
                            <button onClick={() => setShowJoin(true)} className="w-full text-left text-sm text-slate-300 hover:text-primary-400 transition-colors py-1 flex items-center gap-2">
                                <KeyRound size={14} /> Join with invite code
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Join Modal */}
            <AnimatePresence>
                {showJoin && <JoinTournament onClose={() => setShowJoin(false)} />}
            </AnimatePresence>
        </>
    );
};

export default Lobby;
