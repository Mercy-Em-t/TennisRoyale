import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import {
    collection, query, where, onSnapshot,
    doc, updateDoc, getDoc, addDoc, serverTimestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, ClipboardCheck, AlertTriangle, Wifi, WifiOff,
    CheckCircle2, Crown, Activity, Calendar, Play, ListChecks,
    Clock, Trophy, Users, History
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SafetyService from '../services/SafetyService';

const OfficialDashboard = () => {
    const { currentUser, isDevMode } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [assignedMatches, setAssignedMatches] = useState([]);
    const [pastMatches, setPastMatches] = useState([]);
    const [tab, setTab] = useState('assigned');
    const [loading, setLoading] = useState(true);

    const tournamentId = 'tournament-123'; // In production, current target tournament

    // Mock data for dev
    const MOCK_ASSIGNED = [
        { id: 'm1', teamA_Name: 'R. Federer', teamB_Name: 'R. Nadal', court: 'Center Court', time: '14:30', status: 'ready', type: 'Pool A' },
        { id: 'm2', teamA_Name: 'N. Djokovic', teamB_Name: 'C. Alcaraz', court: 'Court 2', time: '16:00', status: 'pending', type: 'Semi-Final' },
    ];

    useEffect(() => {
        const on = () => setIsOnline(true);
        const off = () => setIsOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);

        if (isDevMode) {
            setAssignedMatches(MOCK_ASSIGNED);
            setLoading(false);
        } else {
            const matchesRef = collection(db, `tournaments/${tournamentId}/matches`);
            const q = query(matchesRef, where('refereeId', '==', currentUser.uid));
            const unsubscribe = onSnapshot(q, (snap) => {
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAssignedMatches(data.filter(m => m.status !== 'completed'));
                setPastMatches(data.filter(m => m.status === 'completed'));
                setLoading(false);
            });
            return () => { unsubscribe(); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
        }
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, [isDevMode, currentUser.uid]);

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="glass-card rounded-[2rem] p-4 text-center space-y-1">
            <Icon size={16} className={`mx-auto ${color}`} />
            <p className="text-xl font-black">{value}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase">{label}</p>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto px-4 py-8 space-y-8 pb-24">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight">Official <span className="text-primary-400">Desk</span></h1>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                        {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500" />}
                        {isOnline ? 'System Synchronized' : 'Offline Mode (Local Storage)'}
                    </p>
                </div>
                <div className="w-12 h-12 rounded-[1.25rem] bg-slate-800 flex items-center justify-center border border-slate-700 shadow-xl">
                    <ShieldCheck size={24} className="text-primary-400" />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard icon={Calendar} label="Assigned" value={assignedMatches.length} color="text-primary-400" />
                <StatCard icon={History} label="Completed" value={pastMatches.length} color="text-green-400" />
                <StatCard icon={AlertTriangle} label="Disputes" value="0" color="text-amber-400" />
            </div>

            {/* Role Switcher / Tabs */}
            <div className="flex gap-1 bg-slate-800 p-1.5 rounded-[1.5rem]">
                {[
                    { id: 'assigned', label: 'My Matches', icon: ListChecks },
                    { id: 'history', label: 'Past Events', icon: History }
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${tab === t.id ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="space-y-4">
                <AnimatePresence mode="wait">
                    {tab === 'assigned' ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                            {assignedMatches.length > 0 ? (
                                assignedMatches.map(m => (
                                    <div key={m.id} className="glass-card rounded-[2.5rem] p-6 space-y-5 border-l-4 border-l-primary-500 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Trophy size={60} />
                                        </div>

                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-primary-400 uppercase tracking-tighter ring-1 ring-primary-500/20">
                                                {m.court}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Clock size={12} />
                                                <span className="text-xs font-bold uppercase">{m.time}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1 relative z-10">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.type}</p>
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg font-black">{m.teamA_Name}</span>
                                                <span className="text-xs font-black text-primary-400 opacity-30">VS</span>
                                                <span className="text-lg font-black">{m.teamB_Name}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-3 relative z-10">
                                            {SafetyService.canRefereeMatch(currentUser?.uid, m) ? (
                                                <button
                                                    onClick={() => navigate(`/match/${tournamentId}/${m.id}/score`)}
                                                    className="flex-1 bg-primary-600 hover:bg-primary-500 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-sm transition-all shadow-lg shadow-primary-900/40"
                                                >
                                                    <Play size={16} fill="white" /> Start Scoring
                                                </button>
                                            ) : (
                                                <div className="flex-1 bg-slate-800/50 border border-slate-700 border-dashed py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs text-slate-500 italic">
                                                    Conflict of Interest: Player in Match
                                                </div>
                                            )}
                                            <button className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center border border-slate-700 transition-all">
                                                <Users size={20} className="text-slate-400" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-slate-900/40 rounded-[3rem] border border-slate-800/50 space-y-4">
                                    <ListChecks size={48} className="mx-auto text-slate-800" />
                                    <p className="text-slate-500 font-bold italic">No matches assigned currently.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="text-center py-20 bg-slate-900/40 rounded-[3rem] border border-slate-800/50">
                            <History size={48} className="mx-auto text-slate-800 mb-4" />
                            <p className="text-slate-500 font-bold italic">Historical records cleared.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Desk Alert */}
            <div className="glass-card rounded-[2rem] p-5 flex items-center gap-4 bg-amber-900/10 border-amber-500/30">
                <div className="w-10 h-10 rounded-xl bg-amber-900/30 flex items-center justify-center border border-amber-700/30 shrink-0">
                    <AlertTriangle size={20} className="text-amber-500" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Marshall Alert</p>
                    <p className="text-xs text-slate-400 leading-tight">Match on Court 4 is delayed. Please check in with Ground Staff.</p>
                </div>
            </div>
        </div>
    );
};

export default OfficialDashboard;
