import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Calendar, Trophy, MessageSquare,
    CheckCircle2, AlertCircle, Clock, ChevronRight,
    Filter, Mail
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Notifications = () => {
    const { userRole } = useAuth();
    const [filter, setFilter] = useState('all');

    // Mock Notifications Data
    const [notifications, setNotifications] = useState([
        {
            id: 'n1',
            type: 'match',
            title: 'Match Reminder',
            body: "Your match against R. Federer starts in 1 hour on Center Court.",
            time: 'moment ago',
            read: false,
            role: 'player'
        },
        {
            id: 'n2',
            type: 'approval',
            title: 'Registration Approved',
            body: "You've been accepted into the Nairobi Summer Open!",
            time: '2 hours ago',
            read: true,
            role: 'player'
        },
        {
            id: 'n3',
            type: 'system',
            title: 'Pending Approvals',
            body: '5 new players have requested to join the Coastal Classic.',
            time: '3 hours ago',
            read: false,
            role: 'admin'
        },
        {
            id: 'n4',
            type: 'score',
            title: 'Score Dispute',
            body: 'A score conflict was reported on Court 3. Action required.',
            time: '5 hours ago',
            read: false,
            role: 'official'
        }
    ]);

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'all') return n.role === 'all' || n.role === userRole || (userRole === 'admin' && n.role !== 'player');
        return n.type === filter;
    });

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'match': return <Calendar size={18} className="text-primary-400" />;
            case 'approval': return <CheckCircle2 size={18} className="text-green-400" />;
            case 'system': return <Trophy size={18} className="text-amber-400" />;
            case 'score': return <AlertCircle size={18} className="text-red-400" />;
            default: return <Bell size={18} />;
        }
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black">Alerts</h1>
                    <p className="text-slate-400 text-sm">Updates from your tournaments</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                    <Bell size={20} className="text-primary-400" />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['all', 'match', 'approval', 'system', 'score'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${filter === f
                                ? 'bg-primary-600 border-primary-500 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((n, i) => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => markAsRead(n.id)}
                                className={`glass-card rounded-2xl p-4 flex gap-4 cursor-pointer transition-all border-l-4 ${n.read ? 'border-l-transparent bg-slate-900/40' : 'border-l-primary-500 bg-slate-900/80 shadow-lg'
                                    } hover:border-r-primary-500/30`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-white border border-slate-700'
                                    }`}>
                                    {getTypeIcon(n.type)}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`text-sm font-bold ${n.read ? 'text-slate-400' : 'text-white'}`}>{n.title}</h3>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Clock size={10} /> {n.time}
                                        </span>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${n.read ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {n.body}
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <ChevronRight size={16} className="text-slate-700" />
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-slate-900/50 rounded-3xl p-12 text-center border border-slate-800/50"
                        >
                            <Mail size={40} className="mx-auto text-slate-700 mb-2" />
                            <p className="font-bold text-slate-500 italic">No notifications found.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Clear All Button */}
            {filteredNotifications.length > 0 && (
                <button
                    className="w-full py-3 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    onClick={() => setNotifications([])}
                >
                    Clear All Notifications
                </button>
            )}
        </div>
    );
};

export default Notifications;
