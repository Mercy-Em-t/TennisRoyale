import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMatchSync, MATCH_STATES } from '../hooks/useMatchSync';
import { calculateGameScore, FORMATS } from '../engines/ScoringEngine';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle2, ShieldAlert, Clock, ChevronLeft } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { evaluateSubmissions } from '../services/TournamentService';
import { getExpectedScore } from '../services/RatingService';

const MatchCenter = () => {
    const { tournamentId, matchId } = useParams();
    const { currentUser, isDevMode } = useAuth();
    const navigate = useNavigate();
    const { matchData, loading, submitScore } = useMatchSync(tournamentId, matchId);

    const [p1Score, setP1Score] = useState({ sets: 0, games: 0, points: 0 });
    const [p2Score, setP2Score] = useState({ sets: 0, games: 0, points: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitResult, setSubmitResult] = useState(null);
    const [submitError, setSubmitError] = useState('');

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading Match...</div>;
    if (!matchData) return <div className="text-center p-10">Match not found.</div>;

    const isPlayerA = currentUser.uid === matchData.playerA_Id;
    const isPlayerB = currentUser.uid === matchData.playerB_Id;
    const isParticipant = isPlayerA || isPlayerB;

    // Ecosystem: Win Probability
    const ratingA = matchData.teamA_Rating || 1500;
    const ratingB = matchData.teamB_Rating || 1500;
    const winProbA = (getExpectedScore(ratingA, ratingB) * 100).toFixed(1);
    const winProbB = (100 - parseFloat(winProbA)).toFixed(1);

    const handleSubmission = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        const mySets = isPlayerA ? p1Score.sets : p2Score.sets;
        const theirSets = isPlayerA ? p2Score.sets : p1Score.sets;
        const scorePayload = {
            sets: [{ playerA: isPlayerA ? mySets : theirSets, playerB: isPlayerA ? theirSets : mySets }],
        };

        try {
            let result;
            if (!isDevMode && navigator.onLine) {
                const fn = httpsCallable(getFunctions(), 'submitMatchScore');
                const response = await fn({ tournamentId, matchId, submittedScore: scorePayload });
                result = response.data;
            } else {
                result = await evaluateSubmissions(tournamentId, matchId, currentUser.uid, scorePayload);
            }
            setSubmitResult(result?.result || result?.status || 'completed');
        } catch (err) {
            setSubmitError(err.message || 'Submission failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case MATCH_STATES.LIVE: return 'text-green-400';
            case MATCH_STATES.DISPUTED: return 'text-red-400';
            case MATCH_STATES.COMPLETED: return 'text-primary-400';
            default: return 'text-slate-400';
        }
    };

    const currentScore = calculateGameScore(p1Score.points, p2Score.points);

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-sm font-bold">
                <ChevronLeft size={16} /> BACK TO TOURNAMENT
            </button>

            {/* Match Header */}
            <div className="glass-card p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 border-primary-500/20">
                <div className="text-center md:text-left flex-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Court {matchData.courtAssigned || 'TBD'} · {matchData.tournamentName || 'Summer Open'}
                    </p>
                    <h2 className="text-2xl font-black uppercase tracking-tight">Match Center</h2>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/50 px-5 py-2.5 rounded-2xl border border-slate-700">
                    <Clock size={16} className="text-primary-400" />
                    <span className={`text-xs font-black uppercase tracking-widest ${getStatusColor(matchData.status)}`}>
                        {matchData.status}
                    </span>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Team A */}
                <motion.div
                    whileHover={{ y: -4 }}
                    className={`glass-card p-8 rounded-3xl text-center border-t-4 transition-all ${isPlayerA ? 'border-primary-500 bg-primary-900/10' : 'border-transparent'}`}
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black text-primary-400 shadow-xl">
                        {matchData.teamA_Name?.[0] || 'A'}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <h3 className="text-lg font-black tracking-tight">{matchData.teamA_Name || 'Team A'}</h3>
                        <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{ratingA}</span>
                    </div>
                    {isPlayerA && <span className="text-[8px] bg-primary-600 px-2 py-0.5 rounded-full font-black uppercase">YOU</span>}
                </motion.div>

                {/* Score Center */}
                <div className="text-center py-4 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-6 mb-2">
                        <div className="text-5xl font-black tracking-tighter">{p1Score.sets}</div>
                        <div className="text-xl text-slate-700 font-bold">:</div>
                        <div className="text-5xl font-black tracking-tighter">{p2Score.sets}</div>
                    </div>
                    <p className="text-slate-600 font-black uppercase text-[10px] tracking-[0.3em] mb-4">SETS WON</p>

                    <div className="inline-flex items-center gap-4 bg-slate-800/80 py-2 px-6 rounded-2xl border border-slate-700 mb-6 font-black">
                        <span className="text-primary-400">{currentScore.score1 || '0'}</span>
                        <span className="text-slate-600 px-2">-</span>
                        <span className="text-primary-400">{currentScore.score2 || '0'}</span>
                    </div>

                    {/* Win Probability Bar */}
                    <div className="w-full max-w-[200px] space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-500 tracking-widest px-1">
                            <span>{winProbA}% Win</span>
                            <span>{winProbB}%</span>
                        </div>
                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden flex">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${winProbA}%` }} className="h-full bg-primary-500 shadow-lg shadow-primary-500/50" />
                            <motion.div initial={{ width: 0 }} animate={{ width: `${winProbB}%` }} className="h-full bg-slate-700" />
                        </div>
                    </div>
                </div>

                {/* Team B */}
                <motion.div
                    whileHover={{ y: -4 }}
                    className={`glass-card p-8 rounded-3xl text-center border-t-4 transition-all ${isPlayerB ? 'border-primary-500 bg-primary-900/10' : 'border-transparent'}`}
                >
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl font-black shadow-xl">
                        {matchData.teamB_Name?.[0] || 'B'}
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <h3 className="text-lg font-black tracking-tight">{matchData.teamB_Name || 'Team B'}</h3>
                        <span className="text-[9px] font-black bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{ratingB}</span>
                    </div>
                    {isPlayerB && <span className="text-[8px] bg-primary-600 px-2 py-0.5 rounded-full font-black uppercase">YOU</span>}
                </motion.div>
            </div>

            {/* Interaction Scenarios */}
            <AnimatePresence>
                {matchData.status === MATCH_STATES.LIVE && isParticipant && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-3xl border border-primary-500/20"
                    >
                        <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                            <CheckCircle2 size={16} className="text-primary-400" /> Submit Final Score
                        </h4>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">My Sets</label>
                                <input
                                    type="number"
                                    value={isPlayerA ? p1Score.sets : p2Score.sets}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (isPlayerA) setP1Score(prev => ({ ...prev, sets: val }));
                                        else setP2Score(prev => ({ ...prev, sets: val }));
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-3xl font-black text-center focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Their Sets</label>
                                <input
                                    type="number"
                                    value={isPlayerA ? p2Score.sets : p1Score.sets}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        if (isPlayerA) setP2Score(prev => ({ ...prev, sets: val }));
                                        else setP1Score(prev => ({ ...prev, sets: val }));
                                    }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-3xl font-black text-center focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSubmission}
                            disabled={isSubmitting}
                            className="w-full bg-primary-600 hover:bg-primary-500 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-primary-900/40 active:scale-[0.98]"
                        >
                            {isSubmitting ? 'PROCESSING...' : 'CONFIRM MATCH RESULT'}
                        </button>
                    </motion.div>
                )}

                {matchData.status === MATCH_STATES.DISPUTED && (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-red-900/10 border border-red-500/50 p-6 rounded-3xl flex items-center gap-4"
                    >
                        <ShieldAlert size={32} className="text-red-500 shrink-0" />
                        <div>
                            <h4 className="text-sm font-black text-red-500 uppercase tracking-widest">Score Dispute</h4>
                            <p className="text-xs text-slate-400">Scores do not match. Awaiting official resolution.</p>
                        </div>
                    </motion.div>
                )}

                {matchData.status === MATCH_STATES.COMPLETED && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card p-10 rounded-3xl text-center border-b-4 border-primary-500"
                    >
                        <Trophy className="text-accent w-16 h-16 mx-auto mb-4" />
                        <h4 className="text-xl font-black uppercase tracking-widest mb-2">Final Result</h4>
                        <div className="text-4xl font-black tracking-tighter text-primary-400">
                            {matchData.verifiedScore?.sets?.[0]?.playerA} - {matchData.verifiedScore?.sets?.[0]?.playerB}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MatchCenter;
