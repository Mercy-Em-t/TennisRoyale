import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, User, CheckCircle2, Clock, Zap, Shield,
    ChevronLeft, Calendar, Info, AlertCircle
} from 'lucide-react';
import { getMatches, scoreMatch } from '../api';

const CourtCheckIn = () => {
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getMatches(Number(tournamentId));
                setMatches(res.data.matches || res.data || []);
            } catch (err) {
                console.error("Logistics sync failure:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [tournamentId]);

    const handleCheckIn = async (matchId: number, side: '1' | '2') => {
        // Logic to mark as checked in
        alert(`Unit ${side} confirmed arrival for Node ${matchId}`);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Scanning Logistical Grid...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">

            {/* Nav Header */}
            <div className="px-6 h-20 border-b border-slate-900 bg-slate-950/80 backdrop-blur-3xl flex items-center justify-between sticky top-0 z-40">
                <button onClick={() => navigate(-1)} className="p-3 bg-slate-900/50 rounded-xl text-slate-500 hover:text-white transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Logistics Terminal</h1>
                    <p className="text-sm font-black uppercase tracking-tighter italic">Player Arrival Matrix</p>
                </div>
                <div className="w-10" />
            </div>

            <main className="flex-1 p-6 md:p-12 space-y-12 max-w-2xl mx-auto w-full pb-32">

                {/* Status Console */}
                <div className="glass-card rounded-[3rem] p-10 space-y-8 border-t border-primary-500/20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 blur-[80px] rounded-full" />
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary-600/10 text-primary-400 flex items-center justify-center border border-primary-500/20 shadow-xl">
                            <MapPin size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Court Readiness</h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Cross-analyzing arrival packets</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-900 shadow-inner">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Shield size={10} /> Active Nodes</p>
                            <p className="text-2xl font-black text-white">{matches.length}</p>
                        </div>
                        <div className="bg-slate-950/50 rounded-2xl p-5 border border-slate-900 shadow-inner">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Clock size={10} /> Latency</p>
                            <p className="text-2xl font-black text-white">4m</p>
                        </div>
                    </div>
                </div>

                {/* Match Stream */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] px-4">Live Check-In Stack</h3>

                    <div className="space-y-4">
                        {matches.length > 0 ? matches.map((m, i) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="glass-card rounded-[2.5rem] p-8 space-y-8 border border-slate-900 hover:border-primary-500/20 transition-all shadow-xl group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ASAP'}</p>
                                        <h4 className="text-lg font-black text-white uppercase tracking-tight">Court {m.court || 'N/A'}</h4>
                                    </div>
                                    <div className="p-3 bg-slate-900 rounded-xl text-slate-500">
                                        <Info size={16} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Player 1 */}
                                    <div className="bg-slate-950/80 rounded-3xl p-6 border border-slate-900 flex flex-col items-center gap-5 group-hover:bg-slate-900/40 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl font-black text-slate-400 border border-slate-800">
                                            {m.player1_name?.[0] || 'A'}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-white uppercase truncate max-w-[120px]">{m.player1_name || 'Unit A'}</p>
                                            <p className="text-[9px] font-black text-slate-600 uppercase mt-1">Status: Pending</p>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(m.id, '1')}
                                            className="w-full py-3 bg-slate-900 hover:bg-primary-600 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 text-slate-500 hover:text-white"
                                        >
                                            Confirm Arrival
                                        </button>
                                    </div>

                                    {/* Player 2 */}
                                    <div className="bg-slate-950/80 rounded-3xl p-6 border border-slate-900 flex flex-col items-center gap-5 group-hover:bg-slate-900/40 transition-all">
                                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl font-black text-slate-400 border border-slate-800">
                                            {m.player2_name?.[0] || 'B'}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-black text-white uppercase truncate max-w-[120px]">{m.player2_name || 'Unit B'}</p>
                                            <p className="text-[9px] font-black text-slate-600 uppercase mt-1">Status: Pending</p>
                                        </div>
                                        <button
                                            onClick={() => handleCheckIn(m.id, '2')}
                                            className="w-full py-3 bg-slate-900 hover:bg-primary-600 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-slate-800 text-slate-500 hover:text-white"
                                        >
                                            Confirm Arrival
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-800 space-y-4">
                                <AlertCircle size={40} />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Arrival stack void</p>
                            </div>
                        )}
                    </div>
                </div>

            </main>

        </div>
    );
};

export default CourtCheckIn;
