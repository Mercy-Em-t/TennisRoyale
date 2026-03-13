import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2, ShieldAlert, Clock, ChevronLeft, Swords, Activity, Zap } from 'lucide-react';
import { getMatches, scoreMatch } from '../api';

const MatchCenter = () => {
    const { id: tournamentId, matchId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [matchData, setMatchData] = useState<any>(null);
    const [p1Score, setP1Score] = useState(0);
    const [p2Score, setP2Score] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getMatches(Number(tournamentId));
                const matches = res.data.matches || res.data || [];
                const found = matches.find((m: any) => String(m.id) === String(matchId));
                if (found) {
                    setMatchData(found);
                    setP1Score(Number(found.score_player1) || 0);
                    setP2Score(Number(found.score_player2) || 0);
                }
            } catch (err) {
                console.error("Failed to load match center:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [tournamentId, matchId]);

    const handleSubmission = async () => {
        if (!matchData) return;
        setSubmitting(true);
        try {
            const winnerId = p1Score > p2Score ? matchData.player1_id : matchData.player2_id;
            await scoreMatch(Number(tournamentId), Number(matchId), {
                score_player1: p1Score,
                score_player2: p2Score,
                winner_id: winnerId
            });
            navigate(`/tournaments/${tournamentId}/matches`);
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Logical collision: could not sync score matrix.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Accessing Match Matrix...</p>
        </div>
    );

    if (!matchData) return <div className="text-center p-20 text-red-500 font-black uppercase tracking-widest">Node Not Found</div>;

    const isParticipant = user?.id === matchData.player1_id || user?.id === matchData.player2_id;
    const isPlayer1 = user?.id === matchData.player1_id;

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-10 pb-32">

            <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                <ChevronLeft size={16} /> Retreat to Draw
            </button>

            {/* Header Area */}
            <div className="glass-card p-10 rounded-[3rem] border border-primary-500/20 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left space-y-2">
                        <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em]">Encounter Protocol</p>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Match Center</h2>
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                                <Clock size={12} className="text-slate-600" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{matchData.status}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                                <Activity size={12} className="text-primary-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Court {matchData.court || '3'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block">
                        <div className="w-20 h-20 bg-slate-950 rounded-3xl border border-slate-800 flex items-center justify-center text-primary-400">
                            <Swords size={32} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Scoreboard Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Entity Alpha */}
                <div className={`glass-card p-10 rounded-[3rem] text-center border-b-4 transition-all ${isPlayer1 ? 'border-primary-500 bg-primary-900/10' : 'border-slate-800'}`}>
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 mx-auto mb-6 flex items-center justify-center text-3xl font-black border border-slate-800 shadow-2xl text-white">
                        {matchData.player1_name?.[0] || 'A'}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{matchData.player1_name || 'Unit Alpha'}</h3>
                        {isPlayer1 && <span className="text-[9px] bg-primary-600 px-3 py-1 rounded-full font-black uppercase text-white tracking-widest shadow-lg shadow-primary-900/40">Registered: YOU</span>}
                    </div>
                </div>

                {/* Conflict Node */}
                <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-7xl font-black text-white tabular-nums tracking-tighter">{p1Score}</div>
                        <div className="text-2xl text-slate-800 font-bold">:</div>
                        <div className="text-7xl font-black text-white tabular-nums tracking-tighter">{p2Score}</div>
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Current Delta</span>
                    </div>
                </div>

                {/* Entity Bravo */}
                <div className={`glass-card p-10 rounded-[3rem] text-center border-b-4 transition-all ${!isPlayer1 && isParticipant ? 'border-primary-500 bg-primary-900/10' : 'border-slate-800'}`}>
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 mx-auto mb-6 flex items-center justify-center text-3xl font-black border border-slate-800 shadow-2xl text-white">
                        {matchData.player2_name?.[0] || 'B'}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">{matchData.player2_name || 'Unit Bravo'}</h3>
                        {!isPlayer1 && isParticipant && <span className="text-[9px] bg-primary-600 px-3 py-1 rounded-full font-black uppercase text-white tracking-widest shadow-lg shadow-primary-900/40">Registered: YOU</span>}
                    </div>
                </div>
            </div>

            {/* Submission Protocol */}
            <AnimatePresence>
                {matchData.status !== 'completed' && isParticipant && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-12 rounded-[4rem] border border-primary-500/10 shadow-3xl text-center space-y-10"
                    >
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.5em] italic">Confirmation Stream</h4>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Verify and submit the final score matrix</p>
                        </div>

                        <div className="flex justify-center gap-10">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">P1 Sets</label>
                                <input
                                    type="number"
                                    value={p1Score}
                                    onChange={(e) => setP1Score(Number(e.target.value))}
                                    className="w-24 bg-slate-900 border-2 border-slate-800 rounded-2xl py-6 text-4xl font-black text-center text-white focus:border-primary-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">P2 Sets</label>
                                <input
                                    type="number"
                                    value={p2Score}
                                    onChange={(e) => setP2Score(Number(e.target.value))}
                                    className="w-24 bg-slate-900 border-2 border-slate-800 rounded-2xl py-6 text-4xl font-black text-center text-white focus:border-primary-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmission}
                            disabled={submitting}
                            className="w-full py-6 bg-primary-600 hover:bg-primary-500 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl shadow-primary-950/40"
                        >
                            {submitting ? 'COMMITTING DATA...' : 'VERIFY & SYNC RESULTS'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default MatchCenter;
