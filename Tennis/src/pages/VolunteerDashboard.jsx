import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardCheck, Clock, MapPin, UserCheck,
    Calendar, AlertCircle, ChevronRight, Info,
    CheckCircle2, Circle, HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const VolunteerDashboard = () => {
    const { isDevMode } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const MOCK_TASKS = [
        { id: 'v1', title: 'Court Side Water Supply', venue: 'Court 1-4', time: '10:00 - 12:00', status: 'upcoming', type: 'duty' },
        { id: 'v2', title: 'Player Check-in Desk', venue: 'Main Entrance', time: '09:00 - 14:00', status: 'active', type: 'duty' },
        { id: 'v3', title: 'Match Result Courier', venue: 'All Courts', time: 'Ongoing', status: 'completed', type: 'runner' }
    ];

    useEffect(() => {
        if (isDevMode) {
            setTasks(MOCK_TASKS);
            setLoading(false);
        }
    }, [isDevMode]);

    const StatusIcon = ({ status }) => {
        if (status === 'active') return <Clock size={16} className="text-primary-400 animate-pulse" />;
        if (status === 'completed') return <CheckCircle2 size={16} className="text-green-500" />;
        return <Circle size={16} className="text-slate-600" />;
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Staff <span className="text-primary-400">Hub</span></h1>
                    <p className="text-slate-500 text-sm font-medium">Volunteer & Operations Console</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-400 relative">
                    <Calendar size={20} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-600 rounded-full text-[8px] flex items-center justify-center font-black text-white">2</span>
                </div>
            </div>

            {/* Shift Tracker */}
            <div className="glass-card rounded-[2.5rem] p-6 bg-slate-900/40 relative overflow-hidden border-primary-500/20">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} className="text-primary-400" /> Current Shift
                    </h3>
                    <span className="text-[10px] bg-primary-900/30 text-primary-400 px-3 py-1 rounded-full font-black border border-primary-800/40">SHIFT ACTIVE</span>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-primary-400 shrink-0 border border-slate-700">
                            <UserCheck size={24} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-lg">Main Entrance Desk</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} /> Tournament HQ · 14:00 Ending</p>
                        </div>
                    </div>

                    <button className="w-full py-4 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-900/40">
                        Check-Out Now
                    </button>
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Assigned Duties</h3>
                    <button className="text-[10px] font-black text-primary-400 uppercase tracking-widest">View All</button>
                </div>

                <div className="space-y-3">
                    {tasks.map((task, i) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass-card rounded-3xl p-5 flex items-center justify-between group cursor-pointer hover:bg-slate-900/50 transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${task.status === 'active' ? 'bg-primary-600/20 text-primary-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                    <ClipboardCheck size={20} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className={`font-bold ${task.status === 'completed' ? 'line-through text-slate-600' : 'text-slate-200'}`}>{task.title}</p>
                                    <p className="text-[10px] text-slate-500 font-medium flex items-center gap-2">
                                        <span className="flex items-center gap-1"><Clock size={10} /> {task.time}</span>
                                        <span className="flex items-center gap-1"><MapPin size={10} /> {task.venue}</span>
                                    </p>
                                </div>
                            </div>
                            <StatusIcon status={task.status} />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Support/Alerts */}
            <div className="flex gap-3">
                <div className="flex-1 glass-card rounded-3xl p-5 border-amber-500/20 bg-amber-900/10 space-y-2">
                    <AlertCircle size={20} className="text-amber-400" />
                    <p className="text-[10px] font-black text-amber-400 uppercase">Emergency</p>
                    <p className="text-xs text-slate-400 font-medium">Contact coordinator for on-site issues.</p>
                </div>
                <div className="flex-1 glass-card rounded-3xl p-5 border-slate-700 bg-slate-900/40 space-y-2">
                    <HelpCircle size={20} className="text-slate-400" />
                    <p className="text-[10px] font-black text-slate-500 uppercase">Procedures</p>
                    <p className="text-xs text-slate-400 font-medium">Review tournament rulebook and FAQs.</p>
                </div>
            </div>
        </div>
    );
};

export default VolunteerDashboard;
