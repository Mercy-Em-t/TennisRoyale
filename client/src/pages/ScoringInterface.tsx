import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Trophy, Shield, Zap, AlertTriangle,
    CheckCircle2, Info, History, Undo2, Award, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMatches, scoreMatch } from '../api';
import { ScoringEngine, MatchFormat, MatchScore } from '../engines/ScoringEngine';

const ScoringInterface = () => {
    const { id: tournamentId, matchId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Match State
    const [matchData, setMatchData] = useState<any>(null);
    const [score, setScore] = useState<MatchScore>({
        pointsA: 0,
        pointsB: 0,
        gamesA: 0,
        gamesB: 0,
        setsA: 0,
        setsB: 0,
        isTieBreak: false
    });

    const [history, setHistory] = useState<MatchScore[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getMatches(Number(tournamentId));
                const matches = res.data.matches || res.data || [];
                const found = matches.find((m: any) => String(m.id) === String(matchId));
                if (found) {
                    setMatchData(found);
                    // Initialize score from match data if it exists
                    setScore({
                        pointsA: 0,
                        pointsB: 0,
                        gamesA: 0,
                        gamesB: 0,
                        setsA: Number(found.score_player1) || 0,
                        setsB: Number(found.score_player2) || 0,
                        isTieBreak: false
                    });
                }
            } catch (err) {
                console.error("Failed to load match for scoring:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [tournamentId, matchId]);

    const handlePoint = (winner: 'A' | 'B') => {
        setHistory(prev => [...prev, { ...score }]);
        const nextScore = ScoringEngine.updateScore(score, winner, MatchFormat.FULL_SET);
        setScore(nextScore);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setScore(last);
        setHistory(prev => prev.slice(0, -1));
    };

    const handleFinalize = async (winnerSide: 'A' | 'B') => {
        try {
            const winnerId = winnerSide === 'A' ? matchData.player1_id : matchData.player2_id;
            await scoreMatch(Number(tournamentId), Number(matchId), {
                score_player1: score.setsA,
                score_player2: score.setsB,
                winner_id: winnerId
            });
            navigate(`/tournaments/${tournamentId}/matches`);
        } catch (err) {
            console.error("Failed to finalize score:", err);
            alert("Matrix sync failure: could not commit results.");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Waking Scoring Protocols...</p>
        </div>
    );

    if (!matchData) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-500 font-black uppercase tracking-widest">Encounter Node Null</div>;

    const { labelA, labelB } = ScoringEngine.getPointLabel(score.pointsA, score.pointsB, score.isTieBreak);

    const playerAName = matchData.player1_name || 'Unit Alpha';
    const playerBName = matchData.player2_name || 'Unit Bravo';

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col pb-safe">
            {/* Header */}
            <div className="px-6 h-20 border-b border-slate-900 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-between sticky top-0 z-40">
                <button onClick={() => navigate(-1)} className="p-3 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-all">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em]">Live Arbiter</h1>
                    <p className="text-sm font-black truncate max-w-[150px] uppercase tracking-tighter">Court {matchData.court || 'Center'}</p>
                </div>
                <button onClick={() => setShowConfirm(true)} className="p-3 bg-primary-500/10 rounded-xl text-primary-400 hover:bg-primary-500 hover:text-white transition-all">
                    <CheckCircle2 size={20} />
                </button>
            </div>

            <main className="flex-1 p-5 md:p-10 space-y-10 max-w-4xl mx-auto w-full">

                {/* Visual Scoreboard */}
                <div className="glass-card rounded-[3rem] p-8 md:p-12 space-y-12 relative overflow-hidden border-t-2 border-primary-500/20 shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full" />

                    <div className="flex flex-col md:flex-row justify-between items-center gap-10 relative z-10">
                        {/* Sector Alpha */}
                        <div className="text-center flex-1 space-y-6">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-900 mx-auto flex items-center justify-center border-2 border-slate-800 shadow-2xl text-3xl font-black text-white group-hover:border-primary-500 transition-all">
                                {playerAName[0]}
                            </div>
                            <div>
                                <h2 className="font-black text-xl uppercase tracking-tight">{playerAName}</h2>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="text-[9px] bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary-500/20">SETS: {score.setsA}</span>
                                </div>
                            </div>
                        </div>

                        {/* Encounter State */}
                        <div className="px-8 text-center space-y-2">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-1.5 inline-block">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Current Interval</span>
                            </div>
                            <div className="text-6xl md:text-8xl font-black text-white tabular-nums tracking-tighter flex items-center gap-4">
                                <span className={score.gamesA > score.gamesB ? 'text-primary-400' : 'text-slate-200'}>{score.gamesA}</span>
                                <span className="text-slate-800 opacity-30">:</span>
                                <span className={score.gamesB > score.gamesA ? 'text-primary-400' : 'text-slate-200'}>{score.gamesB}</span>
                            </div>
                        </div>

                        {/* Sector Bravo */}
                        <div className="text-center flex-1 space-y-6">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-900 mx-auto flex items-center justify-center border-2 border-slate-800 shadow-2xl text-3xl font-black text-white group-hover:border-primary-500 transition-all">
                                {playerBName?.[0]}
                            </div>
                            <div>
                                <h2 className="font-black text-xl uppercase tracking-tight">{playerBName}</h2>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="text-[9px] bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-primary-500/20">SETS: {score.setsB}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Point Matrix */}
                    <div className="flex justify-around items-center pt-12 border-t border-slate-900/80 relative z-10 gap-6">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePoint('A')}
                            className={`flex-1 aspect-square md:aspect-auto md:h-40 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all border shadow-2xl
                                ${labelA === 'AD' || (Number(labelA) > Number(labelB) && !score.isTieBreak)
                                    ? 'bg-primary-600 border-primary-500 text-white shadow-primary-900/40'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                        >
                            <span className="text-4xl md:text-6xl font-black italic">{labelA}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Alpha</span>
                        </motion.button>

                        <div className="flex flex-col items-center gap-4 shrink-0 px-4">
                            {score.isTieBreak && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-red-500/10 text-red-500 text-[10px] font-black px-4 py-1.5 rounded-full border border-red-500/20 uppercase tracking-[0.3em] italic">
                                    Tie Break
                                </motion.div>
                            )}
                            <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest text-center writing-mode-vertical">Synchronize Point</p>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handlePoint('B')}
                            className={`flex-1 aspect-square md:aspect-auto md:h-40 rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-all border shadow-2xl
                                 ${labelB === 'AD' || (Number(labelB) > Number(labelA) && !score.isTieBreak)
                                    ? 'bg-primary-600 border-primary-500 text-white shadow-primary-900/40'
                                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                        >
                            <span className="text-4xl md:text-6xl font-black italic">{labelB}</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Bravo</span>
                        </motion.button>
                    </div>
                </div>

                {/* Tactical Overrides */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className="glass-card rounded-[1.5rem] py-5 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-900 disabled:opacity-20 transition-all border border-slate-800/50"
                    >
                        <Undo2 size={16} /> Revert Node
                    </button>
                    <button className="glass-card rounded-[1.5rem] py-5 flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest text-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-950/20 transition-all border border-yellow-900/20">
                        <AlertTriangle size={16} /> Log Dispute
                    </button>
                </div>

                {/* Audit Stream */}
                <section className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-3">
                            <Clock size={14} className="text-primary-500" /> Event Stream
                        </h3>
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                    <div className="space-y-4 max-h-[180px] overflow-y-auto pr-2 scrollbar-hide">
                        {history.slice(-5).reverse().map((h, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-2xl border border-slate-800/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                    <span className="text-xs font-bold text-slate-300">Point Registered</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-600 tabular-nums">P1: {h.pointsA} | P2: {h.pointsB}</span>
                            </motion.div>
                        ))}
                    </div>
                </section>

            </main>

            {/* Finalization Protocol */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfirm(false)} className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60]" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-[3.5rem] p-10 z-[70] border-t border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] space-y-8">
                            <div className="w-16 h-1.5 bg-slate-800 mx-auto rounded-full mb-2" />
                            <div className="text-center space-y-3">
                                <h3 className="text-3xl font-black tracking-tighter uppercase italic">Resolve Encounter</h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">Designate the final victor of this matrix. This protocol is irreversible.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { side: 'A', name: playerAName },
                                    { side: 'B', name: playerBName }
                                ].map(p => (
                                    <button
                                        key={p.side}
                                        onClick={() => handleFinalize(p.side as 'A' | 'B')}
                                        className="bg-slate-950 border-2 border-slate-800 rounded-[2.5rem] p-8 text-center hover:border-primary-500 group transition-all space-y-4 shadow-2xl"
                                    >
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-900 mx-auto flex items-center justify-center text-2xl font-black group-hover:bg-primary-500 group-hover:text-white transition-all border border-slate-800">
                                            {p.name[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-xl uppercase tracking-tight">{p.name}</p>
                                            <p className="text-[9px] font-black text-primary-500 mt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Commence Finalization</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setShowConfirm(false)} className="w-full py-6 text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white transition-colors">Abort Logic</button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScoringInterface;
