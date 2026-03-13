import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Trophy, LineChart, MessageCircle, Target,
    ArrowUpRight, Activity, Zap, History, ChevronRight,
    Search, Filter, Star, Info, Mail, RefreshCw, Plus
} from 'lucide-react';

const CoachHub = () => {
    const { user } = useAuth();
    const [view, setView] = useState<'roster' | 'schedule'>('roster');
    const [search, setSearch] = useState('');

    // Mock data based on legacy functionality
    const ATHLETES = [
        { id: 1, name: 'Nigel Thompson', rank: 'A+', winRate: '78%', status: 'Live: Court 3', tournament: 'Summer Open', lastMatch: 'Won 6-4, 6-2' },
        { id: 2, name: 'Leila Chen', rank: 'B', winRate: '62%', status: 'Idle', tournament: 'Coastal Classic', lastMatch: 'Scheduled 16:00' },
        { id: 3, name: 'Marcus Wright', rank: 'S', winRate: '85%', status: 'Live: Final', tournament: 'City Masters', lastMatch: 'Won 7-5, 6-4' }
    ];

    const filtered = ATHLETES.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-xl mx-auto px-5 py-8 md:py-12 space-y-10 pb-32">

            {/* Header Area */}
            <header className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">
                        Coach <span className="gradient-text italic">Portfolio</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">Commanding {ATHLETES.length} Enrolled Units</p>
                </div>
                <div className="flex gap-2">
                    <button className="w-12 h-12 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary-950/40 transition-all">
                        <Plus size={20} />
                    </button>
                    <button className="w-12 h-12 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center hover:text-white transition-all">
                        <Target size={20} />
                    </button>
                </div>
            </header>

            {/* Matrix Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-[2.5rem] p-6 flex items-center gap-5 border border-primary-500/10 hover:border-primary-500/30 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-primary-600/10 text-primary-400 flex items-center justify-center shrink-0">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white leading-none">2 Live</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Active Now</p>
                    </div>
                </div>
                <div className="glass-card rounded-[2.5rem] p-6 flex items-center gap-5 border border-green-500/10 hover:border-green-500/30 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                        <Trophy size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-white leading-none">75%</p>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Win Flux</p>
                    </div>
                </div>
            </div>

            {/* View Selector */}
            <div className="bg-slate-950 p-1.5 rounded-[2rem] border border-slate-900 flex">
                <button
                    onClick={() => setView('roster')}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${view === 'roster' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-600'}`}
                >
                    Unit Roster
                </button>
                <button
                    onClick={() => setView('schedule')}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${view === 'schedule' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-600'}`}
                >
                    Match Center
                </button>
            </div>

            {/* Unit Search */}
            <div className="relative group">
                <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary-500 transition-colors" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search unit by designation..."
                    className="w-full bg-slate-950/50 border border-slate-900 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-600 transition-all text-white placeholder:text-slate-800"
                />
            </div>

            {/* Roster Stream */}
            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {filtered.map((athlete, i) => (
                        <motion.div
                            key={athlete.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-card rounded-[3rem] p-8 border border-slate-900 hover:border-primary-500/30 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6">
                                {athlete.status.includes('Live') ? (
                                    <span className="flex items-center gap-1.5 text-[8px] font-black text-green-400 bg-green-950/30 px-3 py-1 rounded-full border border-green-800/40 uppercase tracking-widest animate-pulse">
                                        <Zap size={10} className="fill-green-400" /> Live
                                    </span>
                                ) : (
                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{athlete.status}</span>
                                )}
                            </div>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:border-primary-500 group-hover:text-primary-400 transition-all">
                                    <Star size={24} className={athlete.rank === 'S' ? 'text-amber-500 fill-amber-500' : ''} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white group-hover:text-primary-400 transition-all uppercase tracking-tight">{athlete.name}</h3>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[9px] font-black text-primary-400 uppercase tracking-widest">Level {athlete.rank}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter truncate max-w-[120px]">{athlete.tournament}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-950/80 rounded-[1.5rem] p-4 border border-slate-900">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Recent Data</p>
                                    <p className="text-xs font-bold text-slate-300">{athlete.lastMatch}</p>
                                </div>
                                <div className="bg-slate-950/80 rounded-[1.5rem] p-4 border border-slate-900">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Win Threshold</p>
                                    <p className="text-xs font-bold text-slate-300">{athlete.winRate}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button className="flex-1 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-[1.25rem] font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                    <LineChart size={14} /> Analytics
                                </button>
                                <button className="px-6 bg-slate-900 hover:bg-slate-800 text-slate-500 rounded-[1.25rem] border border-slate-800 transition-all">
                                    <MessageCircle size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Strategic Intel Card */}
            <div className="glass-card rounded-[3rem] p-10 bg-gradient-to-br from-indigo-950/40 to-primary-950/40 border-indigo-500/20 flex items-center justify-between shadow-2xl relative overflow-hidden translate-z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent)]" />
                <div className="space-y-2 relative z-10">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Module Update</p>
                    <h3 className="font-black text-2xl text-white tracking-tighter">Opponent Scout</h3>
                    <p className="text-xs text-slate-400 max-w-[200px] font-medium leading-relaxed">Cross-analyze Nigel Thompson's next draw for weakness patterns.</p>
                </div>
                <button className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] flex items-center justify-center shadow-xl shadow-indigo-950/40 transition-all relative z-10">
                    <ArrowUpRight size={24} />
                </button>
            </div>

        </div>
    );
};

export default CoachHub;
