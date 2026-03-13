import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, Zap, Globe, ChevronRight } from 'lucide-react';
import JoinTournament from '../components/JoinTournament';
import AdBanner from '../components/AdBanner';

const formatLabel = { round_robin: 'Round Robin', knockout: 'Knockout', hybrid: 'Pools → Knockout' };
const scoringLabel = { short_set: 'Short Sets', full_set: 'Full Sets', knockout_7: 'Fast 4', knockout_11: 'Pro Set' };

const StatusBadge = ({ status, liveMatches }) => {
    if (status === 'live') return (
        <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 bg-green-900/20 border border-green-800/40 rounded-full px-2.5 py-1 uppercase">
            <Zap size={10} className="fill-green-400" /> Live · {liveMatches || 0} match{liveMatches !== 1 ? 'es' : ''}
        </span>
    );
    if (status === 'registration') return (
        <span className="flex items-center gap-1.5 text-[10px] font-black text-primary-400 bg-primary-900/20 border border-primary-800/40 rounded-full px-2.5 py-1 uppercase">
            Open · Registering
        </span>
    );
    return (
        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 rounded-full px-2.5 py-1 uppercase">Completed</span>
    );
};

const TournamentCard = ({ t, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
    >
        <Link to={`/tournament/${t.id}`} className="block glass-card rounded-2xl p-4 sm:p-5 hover:border-primary-500/40 transition-all group space-y-3">
            {/* Title + venue */}
            <div className="space-y-0.5">
                <h3 className="font-black text-base group-hover:text-primary-400 transition-colors leading-tight">
                    {t.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin size={10} /> {t.venue || 'TBA'}
                </p>
            </div>

            {/* Status badge + tags on same wrapping row */}
            <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={t.status} liveMatches={t.liveMatches} />
                <span className="text-[10px] bg-slate-800 rounded-full px-2.5 py-1 text-slate-400 font-bold">
                    {formatLabel[t.format] || t.format || 'Standard'}
                </span>
                <span className="text-[10px] bg-slate-800 rounded-full px-2.5 py-1 text-slate-400 font-bold">
                    {scoringLabel[t.scoringFormat] || t.scoringFormat || 'Standard'}
                </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-500" />
                    <div className="w-20 sm:w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.min(100, ((t.participantCount || 0) / (t.maxPlayers || 32)) * 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-500">{t.participantCount || 0}/{t.maxPlayers || 32}</span>
                </div>
                <span className="text-xs text-primary-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold">
                    View <ChevronRight size={14} />
                </span>
            </div>
        </Link>
    </motion.div>
);

const Tournaments = () => {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showJoin, setShowJoin] = useState(false);

    useEffect(() => {
        setLoading(true);
        try {
            const q = query(collection(db, 'tournaments'), where('visibility', '==', 'public'));
            const unsub = onSnapshot(q, snap => {
                if (!snap.empty) {
                    setTournaments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                } else {
                    setTournaments([]);
                }
                setLoading(false);
            }, (error) => {
                console.error("Error fetching tournaments:", error);
                setLoading(false);
            });
            return () => unsub();
        } catch (e) {
            setLoading(false);
        }
    }, []);

    const filtered = tournaments.filter(t => {
        if (filter !== 'all' && t.status !== filter) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.venue?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const counts = {
        all: tournaments.length,
        live: tournaments.filter(t => t.status === 'live').length,
        registration: tournaments.filter(t => t.status === 'registration').length,
        completed: tournaments.filter(t => t.status === 'completed').length,
    };

    return (
        <>
            <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black">Explore</h1>
                        <p className="text-slate-400 text-sm">Discover public tournaments</p>
                    </div>
                    <button
                        onClick={() => setShowJoin(true)}
                        className="text-xs bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-xl font-bold transition-all"
                    >
                        + Join Code
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search tournaments or venues..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {[['all', 'All'], ['live', '🟢 Live'], ['registration', '📋 Open'], ['completed', '✅ Done']].map(([val, label]) => (
                        <button
                            key={val}
                            onClick={() => setFilter(val)}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${filter === val
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            {label} <span className="opacity-60">({counts[val]})</span>
                        </button>
                    ))}
                </div>

                {/* Tournament Cards */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-3">
                        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                        <p className="text-slate-500 text-sm font-bold animate-pulse">Loading tournaments...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="space-y-3">
                        <AdBanner format="leaderboard" adSlot={import.meta.env.VITE_AD_SLOT_EVENTS_TOP} />
                        {filtered.map((t, i) => (
                            <React.Fragment key={t.id}>
                                <TournamentCard t={t} index={i} />
                                {(i + 1) % 3 === 0 && i < filtered.length - 1 && (
                                    <AdBanner format="native" adSlot={import.meta.env.VITE_AD_SLOT_EVENTS_NATIVE} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card rounded-3xl p-16 text-center text-slate-500 space-y-2">
                        <Globe size={40} className="mx-auto opacity-20" />
                        <p className="font-bold">No public tournaments found</p>
                        <p className="text-xs">Try a different filter or search term.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showJoin && <JoinTournament onClose={() => setShowJoin(false)} />}
            </AnimatePresence>
        </>
    );
};

export default Tournaments;
