import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTournaments, createTournament } from '../api';
import { Plus, Trophy, Calendar, Users, ChevronRight, Activity, Layout, Search, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors: Record<string, string> = {
    draft: 'bg-slate-800 text-slate-400',
    registration_open: 'bg-green-500/10 text-green-400 border border-green-500/20',
    registration_closed: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    pools_published: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    in_progress: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
    closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
    archived: 'bg-slate-900 text-slate-600',
};

export default function HostDashboard() {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', max_players: 32 });

    const load = async () => {
        try {
            const res = await getTournaments();
            const data = res.data.tournaments || res.data || [];
            setTournaments(Array.isArray(data) ? data : []);
        } catch {
            /* empty */
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await createTournament(form);
            const t = res.data.tournament || res.data;
            navigate(`/tournaments/${t.id}`);
        } catch {
            alert('Failed to initialize tournament');
        }
    };

    return (
        <div className="flex flex-col">
            <main className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-8 py-8 md:py-12 space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-950/20">
                                <Layout size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Host Command Center</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                            MANAGE <span className="gradient-text italic">EVENTS</span>
                        </h1>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-primary-950/40 flex items-center gap-3 w-fit"
                    >
                        <Plus size={18} /> New Tournament
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Active Events', val: tournaments.filter(t => t.status === 'in_progress').length, icon: Activity, color: 'text-primary-400' },
                        { label: 'Total Players', val: '124', icon: Users, color: 'text-indigo-400' },
                        { label: 'Courts Active', val: '8/12', icon: Trophy, color: 'text-yellow-400' },
                        { label: 'Revenue (KES)', val: '42K', icon: Calendar, color: 'text-emerald-400' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-6 rounded-[2rem] flex flex-col gap-1">
                            <div className="flex items-center justify-between mb-2">
                                <s.icon size={16} className={s.color} />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{s.label}</span>
                            </div>
                            <span className="text-2xl font-black text-white">{s.val}</span>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Your Portfolio</h3>
                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                <input placeholder="Filter events..." className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary-500 w-48 transition-all" />
                            </div>
                            <button className="p-2 text-slate-500 hover:text-white transition-colors"><Settings size={18} /></button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-4">
                            {[1, 2, 3].map(i => <div key={i} className="h-24 glass-card animate-pulse rounded-2xl" />)}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {tournaments.length > 0 ? (
                                tournaments.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => navigate(`/tournaments/${t.id}`)}
                                        className="group glass-card p-6 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between hover:border-primary-500/30 transition-all cursor-pointer gap-6"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-700 group-hover:text-primary-500 transition-colors">
                                                <Trophy size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl text-white group-hover:text-primary-400 transition-colors leading-tight uppercase tracking-tight">{t.name}</h3>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColors[t.status] || 'bg-slate-800 text-slate-400'}`}>
                                                        {t.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Users size={10} /> {t.max_players} Players
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="hidden lg:flex flex-col items-end px-6 border-r border-slate-800/50">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Last Update</span>
                                                <span className="text-[11px] font-bold text-slate-400">2 mins ago</span>
                                            </div>
                                            <button className="flex-1 md:flex-none bg-slate-950 hover:bg-primary-600 border border-slate-800 hover:border-primary-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 group/btn">
                                                Control Panel <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-20 glass-card rounded-[3rem] text-center border-dashed border-slate-800">
                                    <div className="w-20 h-20 bg-slate-950/50 rounded-full flex items-center justify-center mx-auto mb-8 border border-slate-800">
                                        <Plus className="text-slate-800" size={32} />
                                    </div>
                                    <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">No Active Tournaments</h4>
                                    <p className="text-slate-600 font-bold text-xs">Initialize your first event to begin hosting.</p>
                                    <button onClick={() => setShowCreate(true)} className="mt-8 text-primary-500 font-black text-[10px] uppercase tracking-widest border-b border-primary-500/30 hover:text-primary-400 transition-colors">Start format builder</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Tournament Modal */}
            <AnimatePresence>
                {showCreate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="glass-card rounded-[3rem] p-10 w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-800"
                        >
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase">Initialize Event</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Configure core tournament parameters</p>

                            <form onSubmit={handleCreate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Tournament Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Summer Open '26"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all placeholder:text-slate-800"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Player Capacity</label>
                                    <input
                                        type="number"
                                        value={form.max_players}
                                        onChange={(e) => setForm({ ...form, max_players: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all"
                                        min={2}
                                    />
                                </div>
                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 px-8 py-4 rounded-2xl bg-slate-900 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-800 hover:bg-slate-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-8 py-4 rounded-2xl bg-primary-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-950/40 hover:bg-primary-500 transition-all"
                                    >
                                        Initialize
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
