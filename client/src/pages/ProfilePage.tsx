import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Settings, LogOut, Award, ChevronRight, Shield, TrendingUp, Edit3 } from 'lucide-react';

const ProfilePage = () => {
    const { user, activeRole, logout } = useAuth();
    const navigate = useNavigate();
    const [editMode, setEditMode] = useState(false);

    // Use mock data for career stats as they aren't in the current backend schema yet
    const rating = 1500;
    const career = { matchesPlayed: 35, wins: 25, losses: 10, titles: 2 };
    const form = ['W', 'W', 'L', 'W', 'W'];

    const profileStats = [
        { label: 'Rating', value: rating, color: 'text-primary-400' },
        { label: 'Wins', value: career.wins, color: 'text-green-400' },
        { label: 'Losses', value: career.losses, color: 'text-red-400' },
        { label: 'Titles', value: career.titles, color: 'text-yellow-400' },
    ];

    const history = [
        { name: 'Nairobi Summer Open', result: 'Runner Up', year: '2026', badge: '🥈' },
        { name: 'Mombasa Beach Classic', result: 'Champion 🏆', year: '2025', badge: '🥇' },
        { name: 'Rift Valley Challengers', result: 'Semi-Finalist', year: '2025', badge: '🥉' },
    ];

    const handleLogout = async () => {
        logout();
        navigate('/');
    };

    return (
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-12">

            <div className="flex items-center justify-between">
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                    Career <span className="gradient-text italic">Identity</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* ── LEFT COLUMN (Profile Card & Navigation) ── */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Avatar + Name */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-[2.5rem] p-8 space-y-6 border-t-2 border-primary-500/20 shadow-2xl"
                    >
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-3xl md:text-4xl font-black text-white shadow-2xl shadow-primary-900/40">
                                    {user?.name?.[0]?.toUpperCase() || 'P'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 shadow-xl" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl md:text-2xl font-black text-white truncate">{user?.name || 'Player'}</h1>
                                <p className="text-sm text-slate-500 truncate font-bold uppercase tracking-widest">{user?.email}</p>
                                <div className="flex items-baseline gap-2 mt-3">
                                    <span className="text-[9px] bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-lg px-2.5 py-1 font-black uppercase tracking-[0.2em]">{activeRole}</span>
                                </div>
                            </div>
                            <button onClick={() => setEditMode(!editMode)} className="p-3 hover:bg-slate-900 rounded-2xl transition-all h-fit group border border-transparent hover:border-slate-800">
                                <Edit3 size={18} className="text-slate-500 group-hover:text-primary-400" />
                            </button>
                        </div>

                        <AnimatePresence>
                            {editMode && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-6 space-y-4 border-t border-slate-900 overflow-hidden"
                                >
                                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">Identity Settings (Mock)</p>
                                    <div className="grid grid-cols-1 gap-2">
                                        <button className="w-full py-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                            Update Profile Metadata
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Workspace Links */}
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] px-4">Workspace Tools</h2>
                        {[
                            { icon: Trophy, label: 'My Participation', path: '/events' },
                            { icon: Settings, label: 'System Settings', path: '/settings' },
                        ].map(({ icon: Icon, label, path }) => (
                            <Link key={label} to={path} className="glass-card rounded-2xl p-5 flex items-center gap-5 hover:bg-slate-900/50 transition-all group border border-transparent hover:border-slate-800">
                                <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-primary-500/10 transition-colors">
                                    <Icon size={18} className="text-slate-500 group-hover:text-primary-400 transition-colors" />
                                </div>
                                <span className="font-black text-sm text-slate-200 flex-1 uppercase tracking-tight">{label}</span>
                                <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ))}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl border border-red-900/30 bg-red-950/20 text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-all font-black text-xs uppercase tracking-widest mt-8 shadow-2xl shadow-red-950/20"
                        >
                            <LogOut size={16} strokeWidth={2.5} /> System Termination
                        </button>
                    </section>
                </div>

                {/* ── RIGHT COLUMN (Career Stats & History) ── */}
                <div className="lg:col-span-8 space-y-10">

                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {profileStats.map(({ label, value, color }) => (
                            <div key={label} className="glass-card rounded-[2rem] p-8 text-center shadow-2xl border border-slate-800/30 flex flex-col justify-center gap-2">
                                <p className={`text-4xl md:text-5xl font-black ${color} tracking-tighter italic`}>{value}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em]">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Advanced Metrics Group */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">

                        {/* Win Rate Multiplier */}
                        <div className="glass-card rounded-[2.5rem] p-10 space-y-6 flex flex-col justify-center">
                            <div className="flex justify-between items-end">
                                <span className="font-black flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-[0.3em]"><TrendingUp size={18} className="text-primary-400" /> Win Frequency</span>
                                <span className="font-black text-5xl text-primary-400 tracking-tighter italic">78%</span>
                            </div>
                            <div className="h-4 bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-800/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '78%' }}
                                    transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-400 rounded-full"
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Global Ranking: Top 5%</p>
                                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">+2.4% Δ</p>
                            </div>
                        </div>

                        {/* Recent Form */}
                        <div className="glass-card rounded-[2.5rem] p-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Engagement Loop</h2>
                                <span className="text-[9px] font-black text-slate-600 tracking-widest uppercase">Last 5 Matches</span>
                            </div>
                            <div className="flex gap-3">
                                {form.map((res, i) => (
                                    <div key={i} className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl font-black shadow-2xl border transition-all
                                        ${res === 'W' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                                        title={res === 'W' ? 'Win' : 'Loss'}
                                    >
                                        {res}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Tournament History Board */}
                    <section className="glass-card rounded-[2.5rem] p-10 border border-slate-800/30">
                        <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-900">
                            <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em] flex items-center gap-3">
                                <Award size={20} className="text-yellow-500" /> Professional Archive
                            </h2>
                            <span className="text-[10px] font-black text-primary-500 hover:text-primary-400 cursor-pointer uppercase tracking-widest transition-colors">Expand Logic</span>
                        </div>

                        <div className="space-y-4">
                            {history.map((h, i) => (
                                <motion.div
                                    key={h.name}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 flex items-center gap-6 hover:bg-slate-900/50 rounded-3xl transition-all group cursor-pointer border border-transparent hover:border-slate-800/50 shadow-xl"
                                >
                                    <div className="text-4xl filter drop-shadow-2xl group-hover:scale-110 transition-transform">{h.badge}</div>
                                    <div className="flex-1">
                                        <p className="font-black text-xl text-white group-hover:text-primary-400 transition-colors uppercase tracking-tight">{h.name}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{h.result}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                            <span className="text-[10px] text-primary-500 font-black uppercase tracking-widest">{h.year}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-700 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                </motion.div>
                            ))}
                        </div>
                    </section>

                </div>

            </div>

        </div>
    );
};

export default ProfilePage;
