import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
    Search, Bell, MapPin, Calendar, ChevronRight,
    Users, Activity, Trophy, Star, MessageSquare
} from 'lucide-react';

// Mock Data for the Feed
const MOCK_ANNOUNCEMENTS = [
    { id: 1, text: "Match schedule updated for Eastlands Open.", icon: <Activity size={16} /> },
    { id: 2, text: "New Mixed Doubles tournament is live!", icon: <Trophy size={16} /> }
];

const MOCK_UPCOMING = [
    {
        id: 'tourn-1',
        name: 'Nairobi Padel Open',
        date: 'June 20, 2026',
        location: 'Parklands Sports Club',
        image: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=600&auto=format&fit=crop',
        tags: ['Padel', 'Round Robin']
    },
    {
        id: 'tourn-2',
        name: 'Eastlands Championship',
        date: 'June 22, 2026',
        location: 'Eastlands Arena',
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=600&auto=format&fit=crop',
        tags: ['Tennis', 'Knockout']
    }
];

const QUICK_ACTIONS = [
    { label: 'My Teams', icon: <Users size={20} />, color: 'bg-indigo-500/20 text-indigo-400', to: '/profile' },
    { label: 'My Events', icon: <Calendar size={20} />, color: 'bg-primary-500/20 text-primary-400', to: '/events' },
    { label: 'Leaderboards', icon: <Trophy size={20} />, color: 'bg-yellow-500/20 text-yellow-400', to: '#leaderboards' },
    { label: 'Sponsors', icon: <Star size={20} />, color: 'bg-emerald-500/20 text-emerald-400', to: '#sponsors' },
];

const Feed = () => {
    const { currentUser, userData } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="max-w-xl md:max-w-5xl lg:max-w-7xl mx-auto px-4 lg:px-8 py-8 md:py-12 pb-32 space-y-10">

            {/* 1. Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-xl font-black shadow-lg shadow-primary-900/30 shrink-0">
                        {userData?.displayName?.[0]?.toUpperCase() || currentUser?.displayName?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-100">
                            Hello, <span className="text-primary-400">{userData?.displayName?.split(' ')[0] || currentUser?.displayName?.split(' ')[0] || 'Player'}</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs md:text-sm tracking-wide uppercase mt-1">
                            Welcome back to the court
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Find tournaments..."
                            className="w-full bg-slate-900 border border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:font-normal text-white"
                        />
                    </div>
                    <button className="relative w-12 h-[52px] bg-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:border-primary-500/50 transition-all shrink-0">
                        <Bell size={20} />
                        <span className="absolute top-3 right-3 w-2 h-2 bg-primary-500 rounded-full border border-slate-900"></span>
                    </button>
                </div>
            </div>

            {/* 2. Hero / Spotlight Banner */}
            <section>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative w-full h-64 md:h-80 rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl shadow-indigo-900/20"
                >
                    {/* Background Image */}
                    <img
                        src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1200&auto=format&fit=crop"
                        alt="Hero Tournament"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col items-start gap-4">
                        <span className="px-3 py-1 bg-primary-500/20 backdrop-blur-md border border-primary-500/50 text-primary-300 text-[10px] font-black uppercase tracking-widest rounded-full">
                            Featured Highlight
                        </span>
                        <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                            Nairobi Summer Open <br />
                            <span className="text-primary-400">June 12</span>
                        </h2>
                        <Link to="/tournaments" className="mt-2 bg-white text-slate-900 hover:bg-primary-50 px-6 py-3 rounded-2xl font-black text-sm transition-colors shadow-lg shadow-white/10 flex items-center gap-2">
                            View Tournament <ChevronRight size={16} />
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* 3. Quick Access Tabs (Shortcuts) */}
            <section className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {QUICK_ACTIONS.map((action, i) => (
                    <Link
                        key={i}
                        to={action.to}
                        className="snap-start min-w-[120px] flex-1 flex flex-col items-center justify-center gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors group"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${action.color} group-hover:scale-110 transition-transform`}>
                            {action.icon}
                        </div>
                        <span className="text-xs font-bold text-slate-300 tracking-wider uppercase text-center">{action.label}</span>
                    </Link>
                ))}
            </section>

            {/* 4. Announcements */}
            <section className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Latest Updates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MOCK_ANNOUNCEMENTS.map((ann, i) => (
                        <motion.div
                            key={ann.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl hover:bg-slate-800/60 transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-primary-400 shrink-0">
                                {ann.icon}
                            </div>
                            <p className="text-sm font-bold text-slate-300">{ann.text}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 5. Upcoming Tournaments */}
            <section className="space-y-5">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Upcoming Near You</h3>
                    <Link to="/tournaments" className="text-xs font-bold text-primary-400 hover:text-primary-300 tracking-wider">See All</Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_UPCOMING.map((t, i) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + (i * 0.1) }}
                            className="group bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden hover:border-primary-500/30 transition-all flex flex-col sm:flex-row"
                        >
                            {/* Card Image */}
                            <div className="relative w-full sm:w-48 h-48 sm:h-auto shrink-0 overflow-hidden">
                                <img
                                    src={t.image}
                                    alt={t.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                                    {t.tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-slate-950/80 backdrop-blur text-[10px] font-bold text-slate-300 rounded uppercase tracking-widest border border-slate-700/50">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-6 flex flex-col justify-between flex-1 gap-6">
                                <div>
                                    <h4 className="font-black text-xl text-slate-200 group-hover:text-primary-400 transition-colors leading-tight">
                                        {t.name}
                                    </h4>
                                    <div className="mt-3 space-y-2">
                                        <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400">
                                            <Calendar size={14} className="text-primary-500/70" /> {t.date}
                                        </p>
                                        <p className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-400">
                                            <MapPin size={14} className="text-primary-500/70" /> {t.location}
                                        </p>
                                    </div>
                                </div>

                                <button className="w-full bg-slate-800 hover:bg-primary-600 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-colors">
                                    View & Join
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

        </div>
    );
};

export default Feed;
