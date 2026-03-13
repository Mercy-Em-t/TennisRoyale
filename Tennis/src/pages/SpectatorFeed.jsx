import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, Tv, Users, MessageSquare, Play,
    TrendingUp, Calendar, Search, MapPin,
    Share2, Heart, Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SpectatorFeed = () => {
    const { isDevMode } = useAuth();
    const [highlights, setHighlights] = useState([]);
    const [liveMatches, setLiveMatches] = useState([]);

    const MOCK_HIGHLIGHTS = [
        { id: 'h1', player: 'Nigel Thompson', action: 'Incredible Backhand Winner', tournament: 'Summer Open', likes: 124, time: '2h ago' },
        { id: 'h2', player: 'Leila Chen', action: 'Match Point Save', tournament: 'Coastal Classic', likes: 89, time: '4h ago' }
    ];

    const MOCK_LIVE = [
        { id: 'l1', players: 'Thompson vs Wright', court: 'Center Court', score: '6-4, 3-2', status: 'Set 2', viewers: '1.2k' },
        { id: 'l2', players: 'Chen vs Davis', court: 'Court 3', score: '2-6, 1-0', status: 'Set 2', viewers: '450' }
    ];

    useEffect(() => {
        if (isDevMode) {
            setHighlights(MOCK_HIGHLIGHTS);
            setLiveMatches(MOCK_LIVE);
        }
    }, [isDevMode]);

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Live <span className="text-primary-400">Feed</span></h1>
                    <p className="text-slate-500 text-sm font-medium">Tournament Highlights & Media</p>
                </div>
                <div className="flex gap-2">
                    <button className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-primary-400">
                        <Tv size={20} />
                    </button>
                    <button className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400">
                        <Search size={20} />
                    </button>
                </div>
            </div>

            {/* Live Now Horizontal Scroll */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Zap size={14} className="text-primary-400" /> Live Now
                    </h3>
                    <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest animate-pulse">● On Air</span>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                    {liveMatches.map(match => (
                        <div key={match.id} className="min-w-[280px] glass-card rounded-[2rem] p-5 space-y-4 bg-slate-900/40 relative overflow-hidden group">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-500 font-bold uppercase">{match.court}</p>
                                    <p className="font-black text-lg">{match.players}</p>
                                </div>
                                <span className="text-[10px] bg-red-950/30 text-red-500 px-2.5 py-1 rounded-full font-black border border-red-900/20">LIVE</span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-2xl font-black tracking-tighter text-primary-400 leading-none">{match.score}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{match.status}</p>
                                </div>
                                <button className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-900/40 group-hover:scale-110 transition-transform">
                                    <Play size={20} className="fill-white" />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                <Users size={12} /> {match.viewers} Watching
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Highlights Feed */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Highlights & Trending</h3>

                {highlights.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card rounded-[2.5rem] overflow-hidden group"
                    >
                        <div className="aspect-video bg-slate-800 relative flex items-center justify-center">
                            <img src={`https://images.unsplash.com/photo-1595435066968-0d0f410c8043?q=80&w=800&auto=format&fit=crop`} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" alt="highlight" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-primary-600 transition-colors">
                                    <Play size={32} className="text-white fill-white ml-1" />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-primary-400 italic font-black">
                                        {item.player[0]}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-200">{item.player}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{item.tournament} • {item.time}</p>
                                    </div>
                                </div>
                                <button className="text-slate-500 hover:text-primary-400 transition-colors">
                                    <Share2 size={18} />
                                </button>
                            </div>

                            <p className="text-sm font-medium text-slate-300">"{item.action}"</p>

                            <div className="flex items-center gap-6 pt-2">
                                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-red-400 transition-colors">
                                    <Heart size={16} /> {item.likes}
                                </button>
                                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-primary-400 transition-colors">
                                    <MessageSquare size={16} /> 24
                                </button>
                                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-400 transition-colors">
                                    <TrendingUp size={16} /> Trending
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Leaderboard Card Fragment */}
            <div className="glass-card rounded-[2.5rem] p-6 bg-primary-900/10 border-primary-500/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary-600 flex items-center justify-center text-white">
                        <Award size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-lg text-primary-400">Tour Rankings</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Standings</p>
                    </div>
                </div>
                <button className="px-6 py-2.5 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700">Open</button>
            </div>
        </div>
    );
};

export default SpectatorFeed;
