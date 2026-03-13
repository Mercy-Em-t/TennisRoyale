import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ClipboardCheck, Clock, MapPin, UserCheck,
    Calendar, AlertCircle, ChevronRight, Info,
    CheckCircle2, Circle, HelpCircle, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const VolunteerHub = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Mock data based on legacy functionality
    const MOCK_TASKS = [
        { id: 'v1', title: 'Court Side Water Supply', venue: 'Court 1-4', time: '10:00 - 12:00', status: 'upcoming', type: 'duty' },
        { id: 'v2', title: 'Player Check-in Desk', venue: 'Main Entrance', time: '09:00 - 14:00', status: 'active', type: 'duty' },
        { id: 'v3', title: 'Match Result Courier', venue: 'All Courts', time: 'Ongoing', status: 'completed', type: 'runner' }
    ];

    useEffect(() => {
        // Simulating data sync
        const timer = setTimeout(() => {
            setTasks(MOCK_TASKS);
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === 'active') return <Clock size={16} className="text-primary-400 animate-pulse" />;
        if (status === 'completed') return <CheckCircle2 size={16} className="text-green-500" />;
        return <Circle size={16} className="text-slate-600" />;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Accessing Staff Grid...</p>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto px-6 py-8 md:py-12 space-y-10 pb-32">

            {/* Header Area */}
            <header className="flex items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none italic">
                        Staff <span className="gradient-text">Hub</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">Operational Unit Control</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 relative">
                    <Calendar size={20} />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full text-[9px] flex items-center justify-center font-black text-white shadow-lg shadow-primary-900/40">2</span>
                </div>
            </header>

            {/* Current Deployment Card */}
            <div className="glass-card rounded-[3rem] p-10 bg-slate-900/40 border border-primary-500/20 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 blur-[80px] rounded-full" />
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em]">Active Deployment</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Signals Active</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-950 flex items-center justify-center text-primary-400 shrink-0 border border-slate-800 shadow-inner">
                            <UserCheck size={28} />
                        </div>
                        <div className="space-y-1">
                            <p className="font-black text-xl text-white uppercase tracking-tight">Main Entrance Desk</p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={12} className="text-slate-700" /> Tournament HQ · 14:00 Termination
                            </p>
                        </div>
                    </div>

                    <button className="w-full py-5 bg-red-950/20 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all border border-red-900/40 shadow-xl shadow-red-950/10">
                        Terminate Shift
                    </button>
                </div>
            </div>

            {/* Task Stream */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Duty Vector Stack</h3>
                    <button className="text-[9px] font-black text-primary-400 uppercase tracking-widest">Protocol View</button>
                </div>

                <div className="space-y-4">
                    {tasks.map((task, i) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`glass-card rounded-[2.5rem] p-7 flex items-center justify-between group cursor-pointer border border-slate-900 hover:border-primary-500/20 transition-all ${task.status === 'completed' ? 'opacity-40 grayscale' : 'shadow-xl'}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${task.status === 'active' ? 'bg-primary-600/10 text-primary-400 border-primary-500/30 shadow-lg shadow-primary-950/20' : 'bg-slate-950 text-slate-600 border-slate-800'
                                    }`}>
                                    <ClipboardCheck size={22} />
                                </div>
                                <div className="space-y-1">
                                    <p className={`font-black text-sm uppercase tracking-tight ${task.status === 'completed' ? 'text-slate-600' : 'text-slate-200'}`}>{task.title}</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-tighter"><Clock size={10} /> {task.time}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                                        <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-tighter"><MapPin size={10} /> {task.venue}</span>
                                    </div>
                                </div>
                            </div>
                            <StatusIcon status={task.status} />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Emergency & Intel */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-[2.5rem] p-8 border-amber-500/10 bg-amber-950/5 space-y-4 shadow-xl">
                    <div className="w-10 h-10 rounded-xl bg-amber-950/40 text-amber-500 flex items-center justify-center border border-amber-900/30">
                        <AlertCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">Emergency</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">Direct Signal to Coordinator HQ</p>
                    </div>
                </div>
                <div className="glass-card rounded-[2.5rem] p-8 border-slate-800 bg-slate-900/40 space-y-4 shadow-xl">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 text-slate-500 flex items-center justify-center border border-slate-800">
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Rulebook</p>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">Protocol Matrix & FAQs</p>
                    </div>
                </div>
            </div>

            {/* Global Broadcast Status */}
            <div className="glass-card rounded-[2.5rem] p-8 flex items-center gap-6 border-indigo-500/10 bg-indigo-950/5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-950/40">
                    <Zap size={20} />
                </div>
                <div>
                    <p className="text-white font-black text-sm uppercase tracking-tight">Staff Broadcast</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-tighter">Unified Communication Online</p>
                </div>
                <button className="ml-auto p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-all">
                    <ChevronRight size={18} />
                </button>
            </div>

        </div>
    );
};

export default VolunteerHub;
