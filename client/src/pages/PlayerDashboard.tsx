import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    Search, Bell, MapPin, Calendar, ChevronRight,
    Users, Activity, Trophy, Star, User, Settings
} from 'lucide-react';
import { getTournaments } from '../api';

const MOCK_ANNOUNCEMENTS = [
    { id: 1, text: "Match schedule updated for Eastlands Open.", icon: <Activity size={16} /> },
    { id: 2, text: "New Mixed Doubles tournament is live!", icon: <Trophy size={16} /> }
];

const QUICK_ACTIONS = [
    { label: 'My Profile', icon: <User size={20} />, color: 'bg-indigo-500/20 text-indigo-400', to: '/profile' },
    { label: 'My Events', icon: <Calendar size={20} />, color: 'bg-primary-500/20 text-primary-400', to: '/events' },
    { label: 'Leaderboards', icon: <Trophy size={20} />, color: 'bg-yellow-500/20 text-yellow-400', to: '/profile' },
    { label: 'Settings', icon: <Settings size={20} />, color: 'bg-emerald-500/20 text-emerald-400', to: '/settings' },
];

export default function PlayerDashboard() {
    const [searchTerm, setSearchTerm] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTournaments();
    }, []);

    const loadTournaments = async () => {
        try {
            const res = await getTournaments();
            const data = res.data.tournaments || res.data || [];
            setTournaments(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch tournaments:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTournaments = tournaments.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 4);

    return (
        <div className="flex flex-col">

            <main className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-8 py-8 md:py-12 space-y-12">
                {/* Greeting Area */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none mb-3">
                            LOBBY <span className="gradient-text italic">FEED</span>
                        </h1>
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] ml-1">
                            System Status: All Courts Operational
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search live draws..."
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white placeholder:text-slate-700"
                            />
                        </div>
                    </div>
                </div>

                {/* Grid layout for Main features */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-14">
                        {/* Hero Feature */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative w-full h-[350px] md:h-[450px] rounded-[3rem] overflow-hidden group shadow-2xl border border-slate-800/50"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200"
                                alt="Tennis court"
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14 flex flex-col items-start gap-5">
                                <div className="flex gap-2">
                                    <span className="px-4 py-1.5 bg-primary-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
                                        Member Spotlight
                                    </span>
                                </div>
                                <h2 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter uppercase">
                                    NAIROBI <br />
                                    <span className="gradient-text italic">SUMMER '26</span>
                                </h2>
                                <button className="mt-4 bg-white text-slate-900 hover:bg-primary-50 px-10 py-5 rounded-2xl font-black text-xs tracking-widest transition-all shadow-2xl shadow-white/10 flex items-center gap-3 uppercase">
                                    Enter Tournament <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>

                        {/* High-end Quick Actions (Lighter & more glass-like) */}
                        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {QUICK_ACTIONS.map((action, i) => (
                                <Link
                                    key={i}
                                    to={action.to}
                                    className="flex flex-col items-center justify-center gap-4 p-8 glass-card rounded-[2.5rem] hover:bg-slate-900/50 transition-all group"
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                                        {action.icon}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase">{action.label}</span>
                                </Link>
                            ))}
                        </section>

                        {/* Tournament Section */}
                        <section className="space-y-10 pt-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Available Events</h3>
                                <button className="text-[10px] font-black text-primary-500 hover:text-primary-400 uppercase tracking-widest transition-colors">View All Draws</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {loading ? (
                                    [1, 2].map(i => <div key={i} className="h-72 glass-card animate-pulse rounded-[2.5rem]" />)
                                ) : filteredTournaments.length > 0 ? (
                                    filteredTournaments.map((t) => (
                                        <div key={t.id} className="group glass-card rounded-[2.5rem] overflow-hidden hover:border-primary-500/30 transition-all flex flex-col">
                                            <div className="h-44 overflow-hidden relative">
                                                <img
                                                    src={'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=600'}
                                                    alt={t.name}
                                                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                                                />
                                                <div className="absolute top-5 right-5 px-3 py-1 bg-slate-950/90 text-[9px] font-black text-primary-400 rounded-lg border border-primary-900/30 uppercase tracking-widest backdrop-blur-md">
                                                    {t.status.replace('_', ' ')}
                                                </div>
                                            </div>
                                            <div className="p-8 flex flex-col flex-1 gap-8">
                                                <div>
                                                    <h4 className="font-black text-2xl text-white group-hover:text-primary-400 transition-colors leading-tight uppercase tracking-tight">
                                                        {t.name}
                                                    </h4>
                                                    <div className="mt-5 flex items-center gap-6">
                                                        <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                            <Calendar size={14} className="text-primary-500" />
                                                            {new Date(t.created_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                            <MapPin size={14} className="text-primary-500" />
                                                            {t.location || 'Nairobi'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className="w-full bg-slate-950/50 hover:bg-primary-600 border border-slate-800 hover:border-primary-500 text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl hover:shadow-primary-900/20">
                                                    Enter Draw
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full p-20 glass-card rounded-[3rem] text-center">
                                        <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-800">
                                            <Activity className="text-slate-800" size={32} />
                                        </div>
                                        <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">No active events broadcasted</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="lg:col-span-4 space-y-12">
                        {/* Announcements Side Panel */}
                        <section className="space-y-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-2">Court Side</h3>
                            <div className="space-y-4">
                                {MOCK_ANNOUNCEMENTS.map((ann) => (
                                    <div key={ann.id} className="p-8 glass-card rounded-[2.5rem] hover:bg-slate-900/60 transition-all group">
                                        <div className="flex gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-primary-400 shrink-0 group-hover:scale-110 transition-transform">
                                                {ann.icon}
                                            </div>
                                            <p className="text-xs font-bold text-slate-400 leading-relaxed pt-1">{ann.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Premium Ad Card */}
                        <section className="p-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 blur-[80px] rounded-full" />
                            <Trophy className="text-white/20 mb-8 group-hover:rotate-12 transition-transform" size={48} />
                            <h4 className="text-2xl font-black text-white mb-4 tracking-tighter">GO PREMIUM.</h4>
                            <p className="text-indigo-100 text-[11px] font-bold leading-relaxed mb-8 opacity-80">Unlock court-side check-ins, detailed analytics, and instant push notifications.</p>
                            <button className="w-full bg-white text-indigo-700 font-black text-[10px] uppercase tracking-[0.3em] py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-indigo-950/40">Upgrade Now</button>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
