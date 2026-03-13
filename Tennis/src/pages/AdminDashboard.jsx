import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminService from '../services/AdminService';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Trophy, Shield, TrendingUp, AlertTriangle, ChevronRight,
    Ban, Crown, RefreshCw, DollarSign, Activity, Zap, CheckCircle,
    UserCheck, UserPlus, Clock, Search, Filter, Settings, Layout
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SafetyService from '../services/SafetyService';

const AdminDashboard = () => {
    const { currentUser, isDevMode } = useAuth();
    const [tab, setTab] = useState('overview');
    const [pendingApprovals, setPendingApprovals] = useState([
        { id: 'p1', name: 'Nigel Thompson', tournament: 'Summer Open', rank: 'A+', registeredAt: '2026-03-05' },
        { id: 'p2', name: 'Leila Chen', tournament: 'Coastal Classic', rank: 'B', registeredAt: '2026-03-06' }
    ]);
    const [tournaments, setTournaments] = useState([
        { id: 't1', name: 'Nairobi Summer Open', players: 48, status: 'active', revenue: '$1,200' },
        { id: 't2', name: 'Coastal Classic', players: 24, status: 'registration', revenue: '$600' }
    ]);
    const [stats] = useState({ totalUsers: 842, activeTournaments: 4, pendingFees: '$450' });

    const handleApproval = (id, approve) => {
        setPendingApprovals(prev => prev.filter(p => p.id !== id));
        alert(approve ? 'Player Approved' : 'Registration Rejected');
    };

    const StatCard = ({ icon: Icon, label, value, trend }) => (
        <div className="glass-card rounded-[2.5rem] p-6 space-y-2 relative overflow-hidden group hover:border-primary-500/30 transition-all">
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                </div>
                {trend && <span className="text-[10px] font-black text-green-400 bg-green-950/30 px-2 py-1 rounded-full">{trend}</span>}
            </div>
            <div>
                <p className="text-2xl font-black">{value}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            </div>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-black">System <span className="text-primary-400">Hub</span></h1>
                    <p className="text-slate-500 text-sm font-medium">Global Tournament Orchestration</p>
                </div>
                <div className="flex gap-2">
                    <button className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400"><Search size={20} /></button>
                    <Link to="/create" className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-900/40"><UserPlus size={20} /></Link>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Users} label="Users" value={stats.totalUsers} trend="+12" />
                <StatCard icon={Trophy} label="Events" value={stats.activeTournaments} />
                <StatCard icon={DollarSign} label="Rev" value={stats.pendingFees} trend="+$1k" />
            </div>

            {/* Admin Tabs */}
            <div className="flex gap-1 bg-slate-800 p-1.5 rounded-[1.5rem]">
                {[
                    { id: 'overview', icon: Layout, label: 'Overview' },
                    { id: 'approvals', icon: UserCheck, label: 'Approvals' },
                    { id: 'staff', icon: Shield, label: 'Staffing' }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${tab === t.id ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <t.icon size={13} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                <AnimatePresence mode="wait">
                    {tab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Active Tournaments</h3>
                            {tournaments.map(t => (
                                <div key={t.id} className="glass-card rounded-[2.5rem] p-6 flex items-center justify-between group cursor-pointer hover:bg-slate-900/50 transition-all">
                                    <div className="space-y-1">
                                        <p className="font-bold text-lg">{t.name}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1"><Users size={12} /> {t.players} Players</span>
                                            <span className="flex items-center gap-1"><DollarSign size={12} /> {t.revenue}</span>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-primary-400 group-hover:border-primary-500/30 transition-all">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {tab === 'approvals' && (
                        <motion.div key="approvals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Pending Players</h3>
                                <span className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-black">{pendingApprovals.length}</span>
                            </div>
                            {pendingApprovals.map(p => (
                                <div key={p.id} className="glass-card rounded-[2.5rem] p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="font-bold text-lg">{p.name}</p>
                                            <p className="text-xs text-primary-400 font-bold uppercase">{p.tournament}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-200">Rank {p.rank}</p>
                                            <p className="text-[10px] text-slate-500">{p.registeredAt}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {SafetyService.canApproveRegistration(currentUser?.uid, p.id) ? (
                                            <button onClick={() => handleApproval(p.id, true)} className="flex-1 bg-primary-600 hover:bg-primary-500 py-3 rounded-2xl font-black text-xs transition-all">Approve</button>
                                        ) : (
                                            <div className="flex-1 bg-slate-800 border border-slate-700 py-3 rounded-2xl font-black text-[10px] text-slate-500 text-center flex items-center justify-center gap-2">
                                                <Ban size={12} /> External admin required
                                            </div>
                                        )}
                                        <button onClick={() => handleApproval(p.id, false)} className="flex-1 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 border border-slate-700 py-3 rounded-2xl font-black text-xs transition-all">Reject</button>
                                    </div>
                                </div>
                            ))}
                            {pendingApprovals.length === 0 && (
                                <div className="text-center py-20 bg-slate-900/40 rounded-[3rem] border border-slate-800/50 space-y-2">
                                    <CheckCircle size={40} className="mx-auto text-slate-800" />
                                    <p className="text-slate-500 font-bold italic">No pending registrations.</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {tab === 'staff' && (
                        <motion.div key="staff" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Officer Assignments</h3>
                            <div className="glass-card rounded-[2.5rem] p-8 text-center border-dashed border-2 border-slate-800 bg-transparent flex flex-col items-center gap-4">
                                <Shield size={48} className="text-slate-800" />
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-300">Staff Management Console</p>
                                    <p className="text-xs text-slate-600 max-w-[200px]">Assign officials and scorers to active courts from this view.</p>
                                </div>
                                <button className="px-8 py-3 bg-slate-800 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700">Open Staffer</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminDashboard;
