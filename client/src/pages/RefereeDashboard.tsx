import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getTournament, getMatches, scoreMatch } from '../api';
import { Trophy, Activity, ChevronRight, Swords, ClipboardCheck, Timer, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const statusLabels: Record<string, string> = {
    draft: 'Draft',
    registration_open: 'Registration Open',
    registration_closed: 'Registration Closed',
    in_progress: 'In Progress',
    completed: 'Completed',
    archived: 'Archived',
};

export default function RefereeDashboard() {
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [matches, setMatches] = useState<any[]>([]);
    const [scoreForm, setScoreForm] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTournaments();
    }, []);

    async function loadTournaments() {
        try {
            const res = await getTournaments();
            const data = res.data.tournaments || res.data || [];
            setTournaments(Array.isArray(data) ? data.filter((t: any) => ['in_progress', 'registration_closed', 'pools_published'].includes(t.status)) : []);
        } catch {
            /* empty */
        } finally {
            setLoading(false);
        }
    }

    async function selectTournament(id: number) {
        try {
            const [tRes, mRes] = await Promise.all([getTournament(id), getMatches(id)]);
            setSelectedTournament(tRes.data.tournament || tRes.data);
            setMatches(mRes.data.matches || mRes.data);
        } catch {
            /* empty */
        }
    }

    async function handleScore(matchId: number) {
        const scores = scoreForm[matchId];
        if (!scores || scores.score_player1 == null || scores.score_player2 == null) return;
        try {
            await scoreMatch(selectedTournament.id, matchId, {
                score_player1: parseInt(scores.score_player1),
                score_player2: parseInt(scores.score_player2),
            });
            setScoreForm({ ...scoreForm, [matchId]: {} });
            selectTournament(selectedTournament.id);
        } catch {
            /* empty */
        }
    }

    return (
        <div className="flex flex-col">
            <main className="flex-1 max-w-7xl mx-auto w-full px-5 md:px-8 py-8 md:py-12 space-y-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-lg shadow-green-950/20">
                                <ClipboardCheck size={20} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Official Oversight</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
                            REFEREE <span className="gradient-text italic">PANEL</span>
                        </h1>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Side: Tournament Selection */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Active Events</h3>
                            <Filter size={14} className="text-slate-600" />
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 glass-card animate-pulse rounded-2xl" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tournaments.length > 0 ? (
                                    tournaments.map((t) => (
                                        <div
                                            key={t.id}
                                            className={`group p-6 glass-card rounded-[2rem] cursor-pointer transition-all border-l-4 ${selectedTournament?.id === t.id ? 'border-l-primary-500 bg-slate-900/60' : 'border-l-transparent hover:border-l-slate-700'}`}
                                            onClick={() => selectTournament(t.id)}
                                        >
                                            <div className="font-black text-white uppercase tracking-tight mb-1">{t.name}</div>
                                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                {statusLabels[t.status] || t.status}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-10 glass-card rounded-[2rem] text-center border-dashed border-slate-800">
                                        <p className="text-slate-600 font-black uppercase tracking-widest text-[10px]">No events requiring oversight</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Side: Match Management */}
                    <div className="lg:col-span-8 space-y-8">
                        {selectedTournament ? (
                            <>
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Live Match Matrix</h3>
                                    <span className="text-[10px] font-black text-primary-400 uppercase tracking-widest">{matches.length} Assignments</span>
                                </div>

                                <div className="grid gap-4">
                                    {matches.map((match) => (
                                        <div key={match.id} className="glass-card p-8 rounded-[2.5rem] flex flex-col gap-8 group">
                                            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-6">
                                                <div className="md:col-span-3 text-center md:text-left">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Player 1</span>
                                                    <div className="text-lg font-black text-white uppercase tracking-tight">{match.player1_name || 'TBD'}</div>
                                                </div>

                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600">VS</div>
                                                </div>

                                                <div className="md:col-span-3 text-center md:text-right">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-2">Player 2</span>
                                                    <div className="text-lg font-black text-white uppercase tracking-tight">{match.player2_name || 'TBD'}</div>
                                                </div>
                                            </div>

                                            {match.status !== 'completed' ? (
                                                <div className="pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="space-y-1">
                                                            <input
                                                                type="number"
                                                                placeholder="P1"
                                                                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black focus:ring-1 focus:ring-primary-600 outline-none text-center"
                                                                value={scoreForm[match.id]?.score_player1 ?? ''}
                                                                onChange={(e) => setScoreForm({
                                                                    ...scoreForm,
                                                                    [match.id]: { ...scoreForm[match.id], score_player1: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                        <div className="text-slate-700 text-xl font-black">:</div>
                                                        <div className="space-y-1">
                                                            <input
                                                                type="number"
                                                                placeholder="P2"
                                                                className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-black focus:ring-1 focus:ring-primary-600 outline-none text-center"
                                                                value={scoreForm[match.id]?.score_player2 ?? ''}
                                                                onChange={(e) => setScoreForm({
                                                                    ...scoreForm,
                                                                    [match.id]: { ...scoreForm[match.id], score_player2: e.target.value }
                                                                })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        className="w-full sm:w-auto bg-primary-600 hover:bg-primary-500 text-white px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary-950/30 transition-all flex items-center justify-center gap-2 group/btn"
                                                        onClick={() => handleScore(match.id)}
                                                    >
                                                        Validate Score <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="pt-6 border-t border-slate-800/50 flex items-center justify-center gap-4">
                                                    <div className="px-4 py-2 bg-slate-950 rounded-xl border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        Result Verified
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="p-32 glass-card rounded-[3rem] text-center flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mb-10 border border-slate-800">
                                    <Swords size={32} className="text-slate-800" />
                                </div>
                                <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">No Draw Selected</h4>
                                <p className="text-slate-600 font-bold text-xs">Select a tournament from the sidebar to begin oversight.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
