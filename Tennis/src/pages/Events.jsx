import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, collectionGroup, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Users, Zap, CalendarDays, ChevronRight, Shield, Trophy } from 'lucide-react';
import JoinTournament from '../components/JoinTournament';
import AdBanner from '../components/AdBanner';

const formatLabel = { round_robin: 'Round Robin', knockout: 'Knockout', hybrid: 'Pools → Knockout' };
const scoringLabel = { short_set: 'Short Sets', full_set: 'Full Sets', knockout_7: 'Fast 4', knockout_11: 'Pro Set' };

const StatusBadge = ({ status, liveMatches }) => {
    if (status === 'live') return (
        <span className="flex items-center gap-1.5 text-[10px] font-black text-green-400 bg-green-900/20 border border-green-800/40 rounded-full px-2.5 py-1 uppercase whitespace-nowrap">
            <Zap size={10} className="fill-green-400" /> Live · {liveMatches || 0} match{liveMatches !== 1 ? 'es' : ''}
        </span>
    );
    if (status === 'registration') return (
        <span className="flex items-center gap-1.5 text-[10px] font-black text-primary-400 bg-primary-900/20 border border-primary-800/40 rounded-full px-2.5 py-1 uppercase whitespace-nowrap">
            Open · Preparing
        </span>
    );
    return (
        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 rounded-full px-2.5 py-1 uppercase whitespace-nowrap">Completed</span>
    );
};

const TournamentCard = ({ t, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07 }}
        className="h-full"
    >
        <Link to={`/tournament/${t.id}/my-space`} className="h-full flex flex-col justify-between glass-card rounded-2xl p-4 sm:p-5 hover:border-primary-500/40 transition-all group space-y-4">

            <div className="space-y-3">
                {/* Title + venue */}
                <div className="space-y-1">
                    <h3 className="font-black text-lg md:text-xl group-hover:text-primary-400 transition-colors leading-tight">
                        {t.name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 font-bold tracking-wide">
                        <MapPin size={12} className="text-primary-400/80" /> {t.venue || 'TBA'}
                    </p>
                </div>

                {/* Status badge + tags */}
                <div className="flex flex-wrap gap-2 items-center">
                    <StatusBadge status={t.status} liveMatches={t.liveMatches} />
                    <span className="text-[10px] bg-slate-800 rounded-full px-2.5 py-1 text-slate-400 font-bold tracking-wider">
                        {formatLabel[t.format] || t.format || 'Standard'}
                    </span>
                    <span className="text-[10px] bg-slate-800 rounded-full px-2.5 py-1 text-slate-400 font-bold tracking-wider">
                        {scoringLabel[t.scoringFormat] || t.scoringFormat || 'Standard'}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-slate-500" />
                    <div className="w-24 sm:w-28 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.min(100, ((t.participantCount || 0) / (t.maxPlayers || 32)) * 100)}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-slate-500 ">{t.participantCount || 0}/{t.maxPlayers || 32}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                    <ChevronRight size={16} />
                </div>
            </div>
        </Link>
    </motion.div>
);

const Events = () => {
    const { currentUser, isDevMode } = useAuth();
    const [playingTournaments, setPlayingTournaments] = useState([]);
    const [managedTournaments, setManagedTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showJoin, setShowJoin] = useState(false);

    useEffect(() => {
        if (!currentUser && !isDevMode) return;
        let isMounted = true;

        const loadData = async () => {
            setLoading(true);
            try {
                const uid = isDevMode && !currentUser ? 'dev-user-001' : currentUser?.uid;
                if (!uid) { setLoading(false); return; }

                // 1. Fetch tournaments where Playing
                const participantQuery = query(collectionGroup(db, 'participants'), where('__name__', '==', uid));
                const participantSnap = await getDocs(participantQuery);
                const pPromises = participantSnap.docs.map(async (pDoc) => {
                    const tRef = pDoc.ref.parent.parent;
                    if (!tRef) return null;
                    const tDoc = await getDoc(tRef);
                    return tDoc.exists() ? { id: tDoc.id, ...tDoc.data(), role: 'player' } : null;
                });

                // 2. Fetch tournaments where Managed (Host)
                const hostedQuery = query(collection(db, 'tournaments'), where('hostId', '==', uid));
                const hostedSnap = await getDocs(hostedQuery);
                const hostedList = hostedSnap.docs.map(d => ({ id: d.id, ...d.data(), role: 'admin' }));

                const pList = (await Promise.all(pPromises)).filter(Boolean);

                if (isMounted) {
                    setPlayingTournaments(pList);
                    setManagedTournaments(hostedList);
                }
            } catch (err) {
                console.error("Failed to load tournaments:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();
        return () => { isMounted = false; };
    }, [currentUser, isDevMode]);

    const filterFn = t => {
        if (filter !== 'all' && t.status !== filter) return false;
        if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.venue?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    };

    const managedFiltered = managedTournaments.filter(filterFn);
    const playingFiltered = playingTournaments.filter(filterFn);

    return (
        <>
            <div className="max-w-xl md:max-w-5xl lg:max-w-7xl mx-auto px-4 lg:px-8 py-8 md:py-12 space-y-10 pb-24">

                {/* Header & Search (Desktop Layout aligned) */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-5xl font-black">Event <span className="text-primary-400">Desk</span></h1>
                        <p className="text-slate-500 font-bold text-sm md:text-base mt-1 md:mt-2 tracking-wide uppercase">Tournaments connected to your profile</p>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search your tournaments..."
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:font-normal"
                        />
                    </div>
                </div>

                {/* Managed Section (If any) */}
                <AnimatePresence>
                    {managedTournaments.length > 0 && (
                        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                            <div className="flex items-center justify-between px-1 border-b border-slate-800/60 pb-3">
                                <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={16} className="text-primary-400" /> Managing
                                </h2>
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black">
                                    {managedFiltered.length} Active
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {managedFiltered.map((t, i) => (
                                    <TournamentCard key={t.id} t={t} index={i} />
                                ))}
                            </div>
                        </motion.section>
                    )}
                </AnimatePresence>

                {/* Playing Section */}
                <section className="space-y-5">
                    <div className="flex items-center justify-between px-1 border-b border-slate-800/60 pb-3">
                        <h2 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Trophy size={16} className="text-primary-400" /> Participating
                        </h2>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black">
                            {playingFiltered.length} Entry
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-slate-600 animate-pulse font-bold italic text-lg tracking-widest uppercase">Loading your roster...</div>
                    ) : playingFiltered.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {playingFiltered.map((t, i) => (
                                <TournamentCard key={t.id} t={t} index={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card rounded-[2.5rem] p-12 lg:p-20 text-center text-slate-500 space-y-5 border-dashed border-2 border-slate-800 bg-transparent flex flex-col items-center justify-center min-h-[400px]">
                            <CalendarDays size={64} className="mx-auto text-slate-800/50" />
                            <div>
                                <h3 className="text-2xl font-black text-slate-300">No tournaments joined yet.</h3>
                                <p className="font-bold text-slate-500 mt-2 max-w-sm mx-auto">Your schedule is wide open. Discover events around you and sign up.</p>
                            </div>
                            <Link to="/tournaments" className="inline-block mt-4 bg-primary-600 hover:bg-primary-500 text-white px-10 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary-900/40 hover:scale-105 active:scale-95">
                                Explore Events
                            </Link>
                        </div>
                    )}
                </section>
            </div>

            <AnimatePresence>
                {showJoin && <JoinTournament onClose={() => setShowJoin(false)} />}
            </AnimatePresence>
        </>
    );
};

export default Events;
