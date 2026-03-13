import React, { useState } from 'react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Settings, LogOut, Award, ChevronRight, Shield, Users, TrendingUp, Edit3 } from 'lucide-react';

const Profile = () => {
    const { currentUser, userRole, switchRole, logout } = useAuth();
    const navigate = useNavigate();
    const [editMode, setEditMode] = useState(false);
    const rating = currentUser?.rating || 1500;
    const career = currentUser?.careerStats || { matchesPlayed: 35, wins: 25, losses: 10, titles: 2 };
    const form = currentUser?.recentForm || ['W', 'W', 'L', 'W', 'W'];

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
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="max-w-xl md:max-w-4xl lg:max-w-6xl mx-auto px-4 lg:px-8 py-8 md:py-12 space-y-8 pb-24">

            <div className="flex items-center justify-between pb-2">
                <h1 className="text-3xl md:text-5xl font-black">Career <span className="text-primary-400">Identity</span></h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">

                {/* ── LEFT COLUMN (Profile Card & Navigation) ── */}
                <div className="md:col-span-5 lg:col-span-4 space-y-6">

                    {/* Avatar + Name */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-3xl p-6 lg:p-8 space-y-5 border-t-2 border-primary-500/20"
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-3xl md:text-4xl font-black shadow-2xl shadow-primary-900/40">
                                    {currentUser?.displayName?.[0]?.toUpperCase() || 'D'}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-slate-900 shadow-xl" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl md:text-2xl font-black truncate">{currentUser?.displayName || 'Dev Player'}</h1>
                                <p className="text-sm md:text-base text-slate-400 truncate">{currentUser?.email || 'dev@tennisroyale.app'}</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <span className="text-[10px] bg-primary-900/40 text-primary-400 border border-primary-800/60 rounded-full px-2.5 py-1 font-bold uppercase tracking-wider">{userRole?.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <button onClick={() => setEditMode(!editMode)} className="p-2 hover:bg-slate-800 rounded-xl transition-all h-fit group">
                                <Edit3 size={18} className="text-slate-400 group-hover:text-primary-400" />
                            </button>
                        </div>

                        <AnimatePresence>
                            {editMode && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-4 space-y-3 border-t border-slate-700/50 overflow-hidden"
                                >
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Environment Simulator Setup</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[ROLES.PLAYER, ROLES.HOST, ROLES.OFFICIAL, ROLES.ADMIN].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => switchRole(role)}
                                                className={`py-2 rounded-xl text-xs font-bold border transition-all capitalize whitespace-nowrap px-2 truncate ${userRole === role
                                                    ? 'border-primary-500 bg-primary-900/30 text-primary-400 shadow-inner'
                                                    : 'border-slate-700/50 text-slate-400 hover:border-slate-600 bg-slate-900/50 hover:bg-slate-800'
                                                    }`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Quick Tools Navigation */}
                    <section className="space-y-3">
                        <h2 className="text-xs font-black uppercase text-slate-500 tracking-widest px-2">Workspace Links</h2>
                        {[
                            { icon: Trophy, label: 'My Tournaments', path: '/events' },
                            { icon: Settings, label: 'Account Settings', path: '/settings' },
                        ].map(({ icon: Icon, label, path }) => (
                            <Link key={label} to={path} className="glass-card rounded-2xl p-4 flex items-center gap-4 hover:border-primary-500/30 transition-all group">
                                <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-primary-500/10 transition-colors">
                                    <Icon size={18} className="text-slate-400 group-hover:text-primary-400 transition-colors" />
                                </div>
                                <span className="font-bold text-sm flex-1">{label}</span>
                                <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ))}

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-900/40 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-all font-bold text-sm mt-6"
                        >
                            <LogOut size={16} strokeWidth={2.5} /> System Sign Out
                        </button>
                    </section>
                </div>

                {/* ── RIGHT COLUMN (Career Stats & History) ── */}
                <div className="md:col-span-7 lg:col-span-8 space-y-6">

                    {/* Key Stats Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                        {profileStats.map(({ label, value, color }) => (
                            <div key={label} className="glass-card rounded-2xl p-5 md:p-6 text-center shadow-lg shadow-black/20 flex flex-col justify-center">
                                <p className={`text-3xl md:text-4xl font-black ${color} tracking-tighter`}>{value}</p>
                                <p className="text-[10px] md:text-xs text-slate-500 uppercase mt-2 font-black tracking-widest">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Advanced Metrics Group */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Win Rate Multiplier */}
                        <div className="glass-card rounded-3xl p-6 lg:p-8 space-y-4 flex flex-col justify-center">
                            <div className="flex justify-between items-end">
                                <span className="font-black flex items-center gap-2 text-sm text-slate-400 uppercase tracking-widest"><TrendingUp size={18} className="text-primary-400" /> Win Rate</span>
                                <span className="font-black text-3xl text-primary-400 tracking-tighter">78%</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden shadow-inner mt-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '78%' }}
                                    transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full"
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-xs font-bold text-slate-500">Top 5% globally this season</p>
                                <p className="text-xs font-black text-green-400">+2.4% this month</p>
                            </div>
                        </div>

                        {/* Recent Form */}
                        <div className="glass-card rounded-3xl p-6 lg:p-8 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">Recent Form</h2>
                                <span className="text-[10px] font-bold text-slate-500 tracking-widest">LAST 5 MATCHES</span>
                            </div>
                            <div className="flex gap-2">
                                {form.map((res, i) => (
                                    <div key={i} className={`flex-1 aspect-square rounded-xl flex items-center justify-center text-lg font-black shadow-inner
                                        ${res === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                                        title={res === 'W' ? 'Win' : 'Loss'}
                                    >
                                        {res}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Tournament History Board */}
                    <section className="glass-card rounded-3xl p-6 lg:p-8">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                            <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                <Award size={18} className="text-yellow-500" /> Trophy Cabinet & History
                            </h2>
                            <span className="text-xs font-bold text-primary-400 cursor-pointer hover:underline">View All</span>
                        </div>

                        <div className="space-y-3">
                            {history.map((h, i) => (
                                <motion.div
                                    key={h.name}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-4 flex items-center gap-5 hover:bg-slate-800/50 rounded-2xl transition-colors group cursor-pointer"
                                >
                                    <div className="text-3xl md:text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform">{h.badge}</div>
                                    <div className="flex-1">
                                        <p className="font-black text-base md:text-lg group-hover:text-primary-400 transition-colors">{h.name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{h.result}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <span className="text-xs text-slate-500 font-bold">{h.year}</span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                                </motion.div>
                            ))}
                        </div>
                    </section>

                </div>

            </div>

        </div>
    );
};

export default Profile;
