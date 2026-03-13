import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, Zap, CalendarDays, ChevronRight, Shield, Trophy } from 'lucide-react';
import { getTournaments } from '../api';

const statusColors: Record<string, string> = {
    draft: 'bg-slate-800 text-slate-400',
    registration_open: 'bg-green-500/10 text-green-400 border border-green-500/20',
    registration_closed: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    pools_published: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    in_progress: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
    closed: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const StatusBadge = ({ status }: { status: string }) => {
    const colorClass = statusColors[status] || 'bg-slate-800 text-slate-400';
    return (
        <span className={`flex items-center gap-1.5 text-[10px] font-black rounded-full px-2.5 py-1 uppercase whitespace-nowrap ${colorClass}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

const TournamentCard = ({ t, index }: { t: any; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        className="h-full"
    >
        <Link to={`/tournaments/${t.id}`} className="h-full flex flex-col justify-between glass-card rounded-2xl p-6 hover:border-primary-500/30 transition-all group space-y-6 shadow-2xl">

            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="font-black text-xl text-white group-hover:text-primary-400 transition-colors leading-tight uppercase tracking-tight">
                        {t.name}
                    </h3>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2 font-black uppercase tracking-widest">
                        <MapPin size={12} className="text-primary-500" /> {t.location || 'Nairobi Central'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge status={t.status} />
                    <span className="text-[9px] bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-slate-500 font-black uppercase tracking-widest">
                        {t.format || 'Standard'}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-900">
                <div className="flex items-center gap-3">
                    <Users size={14} className="text-slate-600" />
                    <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            style={{ width: `${Math.min(100, (65))}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">65% Capacity</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center group-hover:bg-primary-500/10 group-hover:text-primary-400 transition-all shadow-lg border border-transparent group-hover:border-primary-500/20">
                    <ChevronRight size={18} />
                </div>
            </div>
        </Link>
    </motion.div>
);

const EventsPage = () => {
    const { user, activeRole } = useAuth();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getTournaments();
                const data = res.data.tournaments || res.data || [];
                setTournaments(data);
            } catch (err) {
                console.error("Failed to load tournaments:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = tournaments.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    // Categorization logic based on newtennis schema
    // Managing = User is host (if we had hostId, but filtering by role for display purposes)
    const managing = activeRole !== 'player' ? filtered : [];
    const participating = activeRole === 'player' ? filtered : [];

    return (
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-12 space-y-12 pb-32">

            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
                        Event <span className="gradient-text italic">Desk</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[10px] mt-2 uppercase tracking-[0.3em] ml-1">Centralized Tournament Hub</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search active matrix..."
                        className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all text-white placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Managed Section */}
            <AnimatePresence>
                {managing.length > 0 && (
                    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                                <Shield size={18} className="text-primary-500" /> Administrative Assets
                            </h2>
                            <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                                {managing.length} Managed
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {managing.map((t, i) => (
                                <TournamentCard key={t.id} t={t} index={i} />
                            ))}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Participating Section */}
            <section className="space-y-8">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Trophy size={18} className="text-primary-500" /> Active Enrollments
                    </h2>
                    <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                        {participating.length} Entries
                    </span>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => <div key={i} className="h-64 glass-card animate-pulse rounded-2xl" />)}
                    </div>
                ) : participating.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {participating.map((t, i) => (
                            <TournamentCard key={t.id} t={t} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-[3rem] p-16 text-center border-dashed border-2 border-slate-800/50 bg-transparent flex flex-col items-center justify-center min-h-[400px] space-y-8 shadow-2xl">
                        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                            <CalendarDays size={48} className="text-slate-800" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">No Active Enrollments</h3>
                            <p className="font-bold text-slate-500 text-xs uppercase tracking-widest max-w-sm mx-auto opacity-70">Your schedule is currently clear. Explore the global feed to find your next challenge.</p>
                        </div>
                        <Link to="/dashboard" className="bg-primary-600 hover:bg-primary-500 text-white px-12 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-2xl shadow-primary-950/40 hover:scale-105 active:scale-95">
                            Discover Events
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
};

export default EventsPage;
