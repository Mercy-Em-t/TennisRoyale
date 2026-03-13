import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Trophy, LineChart, MessageCircle, Target,
    ArrowUpRight, Activity, Zap, History, ChevronRight,
    Search, Filter, Star, Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import BulkRegisterModal from '../components/BulkRegisterModal';
import CoachService from '../services/CoachService';
import { Mail, RefreshCw } from 'lucide-react';

const CoachPortfolio = () => {
    const { currentUser, isDevMode } = useAuth();
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [view, setView] = useState('roster'); // 'roster' | 'schedule'
    const [schedule, setSchedule] = useState([]);

    // Mock Athletes for Dev Mode
    const MOCK_ATHLETES = [
        { id: 'a1', name: 'Nigel Thompson', rank: 'A+', winRate: '78%', status: 'Live: Court 3', tournament: 'Summer Open', lastMatch: 'Won 6-4, 6-2' },
        { id: 'a2', name: 'Leila & Chen', rank: 'B', winRate: '62%', status: 'Idle', tournament: 'Coastal Classic', lastMatch: 'Scheduled 16:00' },
        { id: 'a3', name: 'Marcus Wright', rank: 'S', winRate: '85%', status: 'Live: Final', tournament: 'City Masters', lastMatch: 'Won 7-5, 6-4' }
    ];

    useEffect(() => {
        const fetchRoster = async () => {
            if (isDevMode) {
                setAthletes(MOCK_ATHLETES);
                setSchedule([
                    { id: 'm1', teamName: 'Nigel Thompson', opponent: 'S. Williams', time: '14:30', court: '3', tournament: 'Summer Open', type: 'Singles Semi', checkedIn: false },
                    { id: 'm2', teamName: 'Marcus Wright', opponent: 'R. Nadal', time: '16:00', court: '1', tournament: 'City Masters', type: 'Singles Final', checkedIn: true }
                ]);
                setLoading(false);
                return;
            }
            if (currentUser) {
                const roster = await CoachService.getRoster(currentUser.uid);
                setAthletes(roster);
                const teamSchedule = await CoachService.getTeamSchedule(currentUser.uid);
                setSchedule(teamSchedule);
            }
            setLoading(false);
        };
        fetchRoster();
    }, [isDevMode, currentUser]);

    const filtered = athletes.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black">Coach <span className="text-primary-400">Portfolio</span></h1>
                    <p className="text-slate-500 text-sm font-medium">Monitoring {athletes.length} Athletes</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowBulkModal(true)}
                        className="px-5 h-12 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-primary-900/20 flex items-center gap-2"
                    >
                        <Users size={16} /> Bulk Register
                    </button>
                    <button className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-primary-400">
                        <Target size={20} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card rounded-[2rem] p-5 flex items-center gap-4 bg-primary-900/10 border-primary-500/20">
                    <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shrink-0">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-xl font-black">2 Live</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Matches</p>
                    </div>
                </div>
                <div className="glass-card rounded-[2rem] p-5 flex items-center gap-4 bg-green-900/10 border-green-500/20">
                    <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white shrink-0">
                        <Trophy size={20} />
                    </div>
                    <div>
                        <p className="text-xl font-black">75%</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Team Win Rate</p>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex bg-slate-900 p-1.5 rounded-[1.5rem] border border-slate-800">
                <button
                    onClick={() => setView('roster')}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    Roster
                </button>
                <button
                    onClick={() => setView('schedule')}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'schedule' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
                >
                    Match Center
                </button>
            </div>

            {/* Search (Roster Only) */}
            {view === 'roster' && (
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search roster..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-sm font-medium focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                    />
                </div>
            )}

            {/* Athlete List */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Active Roster</h3>
                {view === 'roster' ? filtered.map(athlete => (
                    <motion.div
                        key={athlete.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden group"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 group-hover:border-primary-500/40 transition-all">
                                    <Star size={24} className={athlete.rank === 'S' ? 'text-amber-400 fill-amber-400' : ''} />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-lg font-black group-hover:text-primary-400 transition-colors uppercase">{athlete.name}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-primary-400 bg-primary-900/30 px-2 py-0.5 rounded-full ring-1 ring-primary-500/20">LEVEL {athlete.rank}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase italic">{athlete.tournament}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                                {athlete.isShadow ? (
                                    <span className="text-[10px] font-black text-amber-500 bg-amber-950/20 px-3 py-1 rounded-full uppercase tracking-tighter border border-amber-900/30 flex items-center gap-1">
                                        <Mail size={10} /> Pending Claim
                                    </span>
                                ) : athlete.status?.includes('Live') ? (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-green-400 bg-green-900/20 px-3 py-1 rounded-full uppercase tracking-tighter border border-green-800/30 animate-pulse">
                                        <Zap size={10} className="fill-green-400" /> {athlete.status}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{athlete.status || 'Idle'}</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 py-1">
                            <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-800/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Last Match</p>
                                <p className="text-xs font-bold text-slate-300">{athlete.lastMatch}</p>
                            </div>
                            <div className="bg-slate-900/40 rounded-2xl p-3 border border-slate-800/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Win Rate</p>
                                <p className="text-xs font-bold text-slate-300">{athlete.winRate}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button className="flex-1 bg-primary-600 hover:bg-primary-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                <Activity size={12} /> Performance
                            </button>
                            {athlete.isShadow ? (
                                <button className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700">
                                    <RefreshCw size={12} /> Resend Invite
                                </button>
                            ) : (
                                <button className="flex-1 bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700">
                                    <MessageCircle size={12} /> Tactical Note
                                </button>
                            )}
                        </div>
                    </motion.div>
                )) : (
                    <div className="space-y-4">
                        {schedule.map(match => (
                            <motion.div
                                key={match.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-4"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{match.tournament}</p>
                                        <h4 className="text-lg font-black text-white">{match.teamName} <span className="text-slate-600 font-medium">vs</span> {match.opponent}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black">{match.time}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase uppercase tracking-widest">Court {match.court}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{match.type}</span>
                                    {match.checkedIn ? (
                                        <span className="text-[10px] font-black text-green-500 bg-green-950/20 px-3 py-1 rounded-full border border-green-900/30">CHECKED IN</span>
                                    ) : (
                                        <button
                                            onClick={() => alert(`Checked-in ${match.athleteName} as Proxy`)}
                                            className="text-[10px] font-black text-primary-400 hover:text-white bg-primary-950/20 hover:bg-primary-600 px-3 py-1 rounded-full border border-primary-900/30 transition-all"
                                        >
                                            PROXY CHECK-IN
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Scout Mode Card */}
            <div className="glass-card rounded-[2rem] p-6 bg-gradient-to-br from-indigo-900/20 to-primary-900/20 border-indigo-500/20 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">New Capability</p>
                    <h3 className="font-black text-lg">Opponent Scout</h3>
                    <p className="text-xs text-slate-400 leading-tight">Analyze Nigel's next opponent strengths and win/loss trends.</p>
                </div>
                <button className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-900/40">
                    <ArrowUpRight size={20} />
                </button>
            </div>
            {/* Modal */}
            <AnimatePresence>
                {showBulkModal && (
                    <BulkRegisterModal
                        tournamentId="summer_open_2024" // Mock ID for demo
                        coachId={currentUser?.uid}
                        onClose={() => setShowBulkModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CoachPortfolio;
