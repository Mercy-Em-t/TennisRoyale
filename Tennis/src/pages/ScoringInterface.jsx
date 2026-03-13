import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, Trophy, Shield, Zap, AlertTriangle,
    CheckCircle2, Info, History, Undo2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ScoringInterface = () => {
    const { tournamentId, matchId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    // Match State
    const [match, setMatch] = useState({
        playerA: 'R. Federer',
        playerB: 'R. Nadal',
        court: 'Center Court',
        setScore: { A: 1, B: 0 },
        gameScore: { A: 40, B: 30 },
        currentSet: { A: 5, B: 4 },
        isDeuce: false,
        status: 'live'
    });

    const [history, setHistory] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);

    // Points logic
    const tennisPoints = [0, 15, 30, 40, 'AD'];

    const handlePoint = (side) => {
        setHistory([...history, { ...match }]);

        const otherSide = side === 'A' ? 'B' : 'A';
        const currentPoints = match.gameScore[side];
        const otherPoints = match.gameScore[otherSide];

        let nextMatch = { ...match };

        if (currentPoints === 40) {
            if (otherPoints === 40) {
                // Deuce -> Advantage
                nextMatch.gameScore[side] = 'AD';
                nextMatch.isDeuce = false;
            } else if (otherPoints === 'AD') {
                // Advantage -> Deuce
                nextMatch.gameScore[otherSide] = 40;
                nextMatch.isDeuce = true;
            } else {
                // Game point won
                winGame(side);
                return;
            }
        } else if (currentPoints === 'AD') {
            // Advantage -> Game won
            winGame(side);
            return;
        } else {
            // Standard point
            const nextIdx = tennisPoints.indexOf(currentPoints) + 1;
            nextMatch.gameScore[side] = tennisPoints[nextIdx];

            if (nextMatch.gameScore.A === 40 && nextMatch.gameScore.B === 40) {
                nextMatch.isDeuce = true;
            }
        }

        setMatch(nextMatch);
    };

    const winGame = (side) => {
        const nextMatch = { ...match };
        nextMatch.currentSet[side] += 1;
        nextMatch.gameScore = { A: 0, B: 0 };
        nextMatch.isDeuce = false;

        // Simple Set logic (first to 6 wins set)
        if (nextMatch.currentSet[side] >= 6) {
            nextMatch.setScore[side] += 1;
            nextMatch.currentSet = { A: 0, B: 0 };
        }

        setMatch(nextMatch);
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const last = history[history.length - 1];
        setMatch(last);
        setHistory(history.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                    <h1 className="text-xs font-black text-primary-400 uppercase tracking-widest">Live Scoring</h1>
                    <p className="text-sm font-bold truncate max-w-[180px]">{match.court}</p>
                </div>
                <button onClick={() => setShowConfirm(true)} className="p-2 -mr-2 text-primary-400 hover:text-primary-300">
                    <CheckCircle2 size={24} />
                </button>
            </div>

            <div className="flex-1 p-4 space-y-6 max-w-xl mx-auto w-full">
                {/* Scoreboard Card */}
                <div className="glass-card rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary-500/5 blur-[100px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 blur-[100px] rounded-full" />

                    <div className="flex justify-between items-center relative z-10">
                        {/* Player A */}
                        <div className="text-center flex-1 space-y-3">
                            <div className="w-16 h-16 rounded-3xl bg-slate-800 mx-auto flex items-center justify-center border border-slate-700 shadow-xl">
                                <span className="text-2xl font-black">{match.playerA[0]}</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">{match.playerA}</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SETS: {match.setScore.A}</p>
                            </div>
                        </div>

                        {/* VS / Current Sets */}
                        <div className="px-6 text-center space-y-1">
                            <p className="text-xs font-bold text-slate-500 uppercase">Set Score</p>
                            <div className="text-4xl font-black text-white tabular-nums tracking-tighter flex items-center gap-3">
                                <span className={match.currentSet.A > match.currentSet.B ? 'text-primary-400' : ''}>{match.currentSet.A}</span>
                                <span className="text-slate-700">-</span>
                                <span className={match.currentSet.B > match.currentSet.A ? 'text-primary-400' : ''}>{match.currentSet.B}</span>
                            </div>
                        </div>

                        {/* Player B */}
                        <div className="text-center flex-1 space-y-3">
                            <div className="w-16 h-16 rounded-3xl bg-slate-800 mx-auto flex items-center justify-center border border-slate-700 shadow-xl">
                                <span className="text-2xl font-black">{match.playerB[0]}</span>
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">{match.playerB}</h2>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SETS: {match.setScore.B}</p>
                            </div>
                        </div>
                    </div>

                    {/* Big Game Points Display */}
                    <div className="flex justify-around items-center pt-8 border-t border-slate-800/50 relative z-10">
                        <div className="text-center group" onClick={() => handlePoint('A')}>
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black transition-all cursor-pointer ${match.gameScore.A === 'AD' || (match.gameScore.A === 40 && match.gameScore.B < 40)
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20 scale-110'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                                }`}>
                                {match.gameScore.A}
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            {match.isDeuce && (
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-amber-500/20 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                                    Deuce
                                </motion.div>
                            )}
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 text-center">Tap side to score point</p>
                        </div>

                        <div className="text-center" onClick={() => handlePoint('B')}>
                            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black transition-all cursor-pointer ${match.gameScore.B === 'AD' || (match.gameScore.B === 40 && match.gameScore.A < 40)
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20 scale-110'
                                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                                }`}>
                                {match.gameScore.B}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Control Tools */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleUndo}
                        disabled={history.length === 0}
                        className="glass-card rounded-2xl py-5 flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-30 disabled:grayscale transition-all hover:bg-slate-800"
                    >
                        <Undo2 size={18} /> Undo
                    </button>
                    <button className="glass-card rounded-2xl py-5 flex items-center justify-center gap-2 font-bold text-sm hover:bg-slate-800 transition-all text-amber-400">
                        <AlertTriangle size={18} /> Dispute
                    </button>
                </div>

                {/* Status Logs */}
                <div className="glass-card rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <History size={14} /> Match Stream
                        </h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="space-y-3 max-h-[160px] overflow-y-auto scrollbar-hide">
                        {history.slice(-4).reverse().map((h, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs opacity-60">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                <p className="text-slate-400">Point to <span className="text-slate-200">{h.gameScore.A !== match.gameScore.A ? match.playerA : match.playerB}</span></p>
                                <span className="ml-auto font-mono text-slate-600">{h.gameScore.A}-{h.gameScore.B}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-3 text-xs bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                            <Zap size={14} className="text-primary-400" />
                            <p className="font-bold">Match started on {match.court}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Finalize Drawer */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfirm(false)} className="fixed inset-0 bg-black/80 z-[60]" />
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-[3rem] p-8 z-[70] border-t border-slate-800 space-y-6 shadow-2xl">
                            <div className="w-12 h-1 bg-slate-700 mx-auto rounded-full mb-2" />
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-black">Finalize Match?</h3>
                                <p className="text-slate-400 text-sm">Please confirm the final winner of this match. This cannot be undone by the referee after submission.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { side: 'A', name: match.playerA },
                                    { side: 'B', name: match.playerB }
                                ].map(p => (
                                    <button
                                        key={p.side}
                                        onClick={() => {
                                            alert(`Winner: ${p.name}. Bracket updated.`);
                                            navigate('/events');
                                        }}
                                        className="bg-slate-800 border-2 border-slate-700 rounded-3xl p-6 text-center hover:border-primary-500 hover:bg-primary-900/10 transition-all space-y-3"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-slate-700 mx-auto flex items-center justify-center text-xl font-black">{p.name[0]}</div>
                                        <p className="font-black text-sm">{p.name}</p>
                                        <div className="text-[10px] font-bold uppercase text-primary-400 py-1 bg-primary-900/40 rounded-full border border-primary-500/30">Confirm Winner</div>
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setShowConfirm(false)} className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors">Cancel</button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ScoringInterface;
