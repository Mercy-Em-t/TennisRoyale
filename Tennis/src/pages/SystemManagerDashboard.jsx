import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, Users, Trophy, Settings, Search, Filter,
    MoreVertical, Eye, Edit3, Trash2, UserPlus,
    Activity, Database, Globe, AlertTriangle,
    ArrowUpRight, Power, UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';

const SystemManagerDashboard = () => {
    const { currentUser, isDevMode } = useAuth();
    const [stats, setStats] = useState({ users: 0, tournaments: 0, revenue: '$12,450', health: '99.9%' });
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('overview'); // 'overview' | 'users' | 'tournaments' | 'logs'

    const MOCK_USERS = [
        { uid: 'u1', name: 'Alice Admin', email: 'alice@host.com', role: 'admin', status: 'Active' },
        { uid: 'u2', name: 'Bob Referee', email: 'bob@ref.com', role: 'referee', status: 'Active' },
        { uid: 'u3', name: 'Charlie Coach', email: 'coach@club.com', role: 'coach', status: 'Inactive' },
        { uid: 'u4', name: 'David Player', email: 'david@player.com', role: 'player', status: 'Active' }
    ];

    useEffect(() => {
        if (isDevMode) {
            setUsers(MOCK_USERS);
            setStats({ users: 1420, tournaments: 42, revenue: '$45,280', health: '100%' });
        }
    }, [isDevMode]);

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* God Mode Header */}
            <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 blur-[80px] -mr-10 -mt-10" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield size={14} className="text-primary-400" />
                        <span className="text-[10px] font-black text-primary-500 uppercase tracking-[0.2em]">Sovereign Level</span>
                    </div>
                    <h1 className="text-3xl font-black">System <span className="text-primary-400">Control</span></h1>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-900/40 relative z-10 ring-4 ring-primary-950/50">
                    <Globe size={24} />
                </div>
            </div>

            {/* View Selector */}
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
                {['overview', 'users', 'tournaments', 'settings'].map(t => (
                    <button
                        key={t}
                        onClick={() => setView(t)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === t ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {view === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Global Heartbeat */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Users</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-white">{stats.users}</p>
                                    <span className="text-[10px] text-green-500 font-bold">+12%</span>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Events</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-black text-white">{stats.tournaments}</p>
                                    <Activity size={12} className="text-primary-400" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity / System Alerts */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Critical Alerts</h3>
                            <div className="bg-amber-900/10 border border-amber-500/20 rounded-3xl p-5 flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center text-amber-500 shrink-0">
                                    <AlertTriangle size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-200">Payment Gateway Latency</p>
                                    <p className="text-xs text-amber-700/80 mt-0.5">Stripe terminal in Zone-3 reporting 1.2s delay.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {view === 'users' && (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                    >
                        <div className="relative">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                placeholder="Search Global Users..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-4 text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            {users.map(u => (
                                <div key={u.uid} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] flex items-center justify-between group hover:border-primary-500/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700 group-hover:text-primary-400 transition-colors">
                                            {u.role === 'admin' ? <Trophy size={20} /> : <Users size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white">{u.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-800 rounded uppercase text-slate-400">{u.role}</span>
                                                <span className="text-[8px] font-bold text-slate-500 italic">{u.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-primary-600 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                                            <UserCheck size={14} />
                                        </button>
                                        <button className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 transition-all">
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quick Action: Platform Proxy */}
            <div className="bg-gradient-to-r from-primary-900/20 to-indigo-900/20 border border-primary-500/20 p-6 rounded-[2.5rem] flex items-center justify-between">
                <div>
                    <h3 className="font-black text-lg">Platform Proxy</h3>
                    <p className="text-xs text-slate-400">Act as any Tournament Host or Referee.</p>
                </div>
                <button className="w-12 h-12 rounded-2xl bg-white text-slate-900 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all">
                    <Power size={20} />
                </button>
            </div>
        </div>
    );
};

export default SystemManagerDashboard;
