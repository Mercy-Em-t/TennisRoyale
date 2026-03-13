import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Zap, Trophy, MessageSquare, Shield, Clock } from 'lucide-react';

interface Notification {
    id: string;
    type: 'match_ready' | 'result' | 'chat' | 'admin';
    title: string;
    message: string;
    time: string;
}

export default function NotificationCenter({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {

    // Mock notifications for UI demonstration
    const NOTIFICATIONS: Notification[] = [
        { id: '1', type: 'match_ready', title: 'Court Assigned', message: 'You are scheduled for Court 3 vs S. Williams. Please report.', time: '2m ago' },
        { id: '2', type: 'result', title: 'Match Verified', message: 'Your victory vs R. Federer has been committed to the bracket.', time: '15m ago' },
        { id: '3', type: 'chat', title: 'Channel Ping', message: 'Referee Alpha broadcasted a new status update to all units.', time: '1h ago' }
    ];

    const icons = {
        match_ready: <Clock size={16} className="text-primary-400" />,
        result: <Trophy size={16} className="text-yellow-500" />,
        chat: <MessageSquare size={16} className="text-blue-400" />,
        admin: <Shield size={16} className="text-red-400" />
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[100] border-l border-slate-800 flex flex-col pt-safe-top"
                    >
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-lg text-primary-400">
                                    <Bell size={18} />
                                </div>
                                <h2 className="text-lg font-black text-white uppercase tracking-tight">Directives</h2>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                            {NOTIFICATIONS.length > 0 ? (
                                NOTIFICATIONS.map((n, i) => (
                                    <motion.div
                                        key={n.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-slate-950/50 border border-slate-800 rounded-[2rem] p-6 hover:border-primary-500/30 transition-all group"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 group-hover:bg-primary-950/20 transition-all">
                                                {icons[n.type]}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-4">
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tighter">{n.title}</h4>
                                                    <span className="text-[8px] font-black text-slate-600 uppercase italic">{n.time}</span>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed">{n.message}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale grayscale-[50%]">
                                    <Bell size={48} className="text-slate-700 mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">The terminal is silent</p>
                                </div>
                            )}
                        </div>

                        <div className="p-8 border-t border-slate-800 bg-slate-900/50">
                            <button className="w-full py-4 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.3em] transition-all border border-slate-700/50">
                                Dismiss All Nodes
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
