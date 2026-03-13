import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { ChevronLeft, Trophy, Calendar, Zap, Award, ListChecks, Shield, BotMessageSquare } from 'lucide-react';
import BracketView from '../components/BracketView';

const MyTournamentSpace = () => {
    const { tournamentId } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('matches');

    // Demo data — replace with Firestore queries in production
    const myMatches = [
        { id: 'm1', opponent: 'R. Federer', court: 'Center Court', time: '14:30', status: 'upcoming' },
        { id: 'm2', opponent: 'R. Nadal', court: 'Court 1', time: '16:00', status: 'upcoming' },
        { id: 'm3', opponent: 'A. Murray', court: 'Court 3', sets: '6-4, 7-5', status: 'won' },
        { id: 'm4', opponent: 'N. Djokovic', court: 'Court 2', sets: '3-6, 6-4, 2-6', status: 'lost' },
    ];

    const poolStandings = [
        { rank: 1, name: 'R. Federer', played: 4, won: 4, points: 12, isMe: false },
        { rank: 2, name: 'Dev Player', played: 3, won: 2, points: 6, isMe: true },
        { rank: 3, name: 'A. Murray', played: 4, won: 2, points: 6, isMe: false },
        { rank: 4, name: 'S. Tsitsipas', played: 4, won: 0, points: 0, isMe: false },
    ];

    const myStats = {
        poolRank: '#2',
        wins: 2,
        losses: 1,
        setsWon: 6,
        setsLost: 3,
    };

    const StatusChip = ({ status }) => {
        const chips = {
            won: <span className="text-[10px] font-bold text-green-400 bg-green-900/20 rounded-full px-2 py-0.5">Won ✓</span>,
            lost: <span className="text-[10px] font-bold text-red-400 bg-red-900/20 rounded-full px-2 py-0.5">Lost</span>,
            upcoming: <span className="text-[10px] font-bold text-primary-400 bg-primary-900/20 rounded-full px-2 py-0.5">Upcoming</span>,
            live: <span className="text-[10px] font-bold text-green-400 bg-green-900/20 rounded-full px-2 py-0.5 flex items-center gap-1"><Zap size={9} />Live</span>,
        };
        return chips[status] || null;
    };


    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
            {/* Back */}
            <button onClick={() => navigate(`/tournament/${tournamentId}`)} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm">
                <ChevronLeft size={16} /> Tournament
            </button>

            {/* Header */}
            <div className="glass-card rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">My Tournament Space</p>
                        <h1 className="text-xl font-black mt-0.5">Summer Open 2026</h1>
                    </div>
                    <div className="text-center bg-primary-900/20 border border-primary-800/30 rounded-2xl px-4 py-3">
                        <p className="text-2xl font-black text-primary-400">{myStats.poolRank}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Team Rank</p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2">
                    {[
                        ['W', myStats.wins, 'text-green-400'],
                        ['L', myStats.losses, 'text-red-400'],
                        ['SF', myStats.setsWon, 'text-primary-400'],
                        ['SA', myStats.setsLost, 'text-slate-400'],
                    ].map(([label, val, color]) => (
                        <div key={label} className="bg-slate-800/50 rounded-xl p-2.5 text-center">
                            <p className={`text-xl font-black ${color}`}>{val}</p>
                            <p className="text-[9px] text-slate-600 uppercase">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tournament Assistant (AI) */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-3xl p-5 border border-primary-500/30 relative overflow-hidden group">
                {/* Background glow effects */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />

                <div className="flex gap-4 relative z-10">
                    <div className="shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-lg group-hover:border-primary-500/50 transition-colors">
                            <BotMessageSquare size={20} className="text-primary-400" />
                        </div>
                    </div>
                    <div className="space-y-1.5 flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                Assistant <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                            </h3>
                            <span className="text-[9px] text-slate-500">Just now</span>
                        </div>
                        <p className="text-sm font-medium text-slate-300 leading-relaxed">
                            You're currently <span className="text-white font-bold">2nd in your pool</span>.
                            Your next match is against <span className="text-primary-400 font-bold">R. Federer</span> at <span className="text-white font-bold">14:30</span> on <span className="text-white font-bold">Center Court</span>.
                            If you win, you guarantee your spot in the knockout stage!
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800 p-1 rounded-2xl">
                {[['matches', '🎾 Matches'], ['standings', '📊 Pool'], ['bracket', '🏆 Bracket']].map(([val, label]) => (
                    <button
                        key={val}
                        onClick={() => setActiveTab(val)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === val ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Matches Tab */}
            {activeTab === 'matches' && (
                <div className="space-y-3">
                    {myMatches.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className="glass-card rounded-2xl p-4 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-800 rounded-xl px-3 py-2 text-center min-w-[48px]">
                                    <p className="text-[9px] text-slate-500 uppercase">Court</p>
                                    <p className="font-black text-primary-400">{m.court.split(' ').pop()}</p>
                                </div>
                                <div>
                                    <p className="font-bold text-sm">vs {m.opponent}</p>
                                    <p className="text-xs text-slate-500">{m.sets || m.time}</p>
                                </div>
                            </div>
                            <StatusChip status={m.status} />
                        </motion.div>
                    ))}

                    {/* Submit Score CTA */}
                    <Link
                        to={`/match/${tournamentId}/my-next-match`}
                        className="block glass-card rounded-2xl p-4 text-center border-dashed border-2 border-primary-500/30 hover:border-primary-500/60 transition-all group"
                    >
                        <p className="text-sm font-bold text-primary-400 group-hover:text-primary-300">
                            ⚡ Submit Match Score →
                        </p>
                    </Link>
                </div>
            )}

            {/* Pool Standings Tab */}
            {activeTab === 'standings' && (
                <div className="glass-card rounded-2xl overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-5 text-[10px] font-bold text-slate-500 uppercase px-4 py-3 border-b border-slate-800 bg-slate-800/30">
                        <span>#</span>
                        <span className="col-span-2">Team / Player</span>
                        <span className="text-center">W</span>
                        <span className="text-center">Pts</span>
                    </div>
                    {poolStandings.map((p, i) => (
                        <motion.div
                            key={p.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.07 }}
                            className={`grid grid-cols-5 items-center px-4 py-3.5 border-b border-slate-800/50 last:border-0 ${p.isMe ? 'bg-primary-900/20' : 'hover:bg-slate-800/30'} transition-all`}
                        >
                            <span className={`font-black text-sm ${p.rank === 1 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                {p.rank === 1 ? '🥇' : p.rank}
                            </span>
                            <span className={`col-span-2 font-bold text-sm ${p.isMe ? 'text-primary-400' : ''}`}>
                                {p.name} {p.isMe && <span className="text-[9px] text-primary-500">(you)</span>}
                            </span>
                            <span className="text-center text-sm font-bold text-green-400">{p.won}</span>
                            <span className="text-center text-sm font-black">{p.points}</span>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Bracket Tab */}
            {activeTab === 'bracket' && (
                <div className="py-4">
                    <BracketView tournamentId={tournamentId} />
                </div>
            )}
        </div>
    );
};

export default MyTournamentSpace;
