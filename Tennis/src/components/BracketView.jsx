import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Zap } from 'lucide-react';
import BracketService from '../services/BracketService';

const BracketView = ({ tournamentId, teams = [] }) => {
    const [rounds, setRounds] = useState([]);

    // Demo teams if none provided
    const demoTeams = [
        { id: 't1', name: 'R. Federer' },
        { id: 't2', name: 'R. Nadal' },
        { id: 't3', name: 'N. Djokovic' },
        { id: 't4', name: 'C. Alcaraz' },
        { id: 't5', name: 'A. Murray' },
        { id: 't6', name: 'S. Tsitsipas' },
        { id: 't7', name: 'H. Rune' },
        { id: 't8', name: 'J. Sinner' },
    ];

    useEffect(() => {
        const activeTeams = teams.length > 0 ? teams : demoTeams;
        const generatedRounds = BracketService.generateSingleElimination(activeTeams);
        setRounds(generatedRounds);
    }, [tournamentId, teams]);

    const RoundMatch = ({ match }) => (
        <div className="relative mb-8 last:mb-0">
            <div className="glass-card rounded-2xl p-4 border border-slate-800 w-48 shadow-lg group hover:border-primary-500/30 transition-all">
                <div className="space-y-2">
                    {/* Team A */}
                    <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${match.winner === match.teamA?.id ? 'text-primary-400' : 'text-slate-400'}`}>
                            {match.teamA?.name || '---'}
                        </span>
                        <span className="text-xs font-black text-slate-500">{match.scoreA}</span>
                    </div>
                    {/* Divider */}
                    <div className="h-px bg-slate-800" />
                    {/* Team B */}
                    <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${match.winner === match.teamB?.id ? 'text-primary-400' : 'text-slate-400'}`}>
                            {match.teamB?.name || '---'}
                        </span>
                        <span className="text-xs font-black text-slate-500">{match.scoreB}</span>
                    </div>
                </div>

                {/* Status indicator */}
                {match.status === 'live' && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full animate-pulse shadow-lg">
                        LIVE
                    </div>
                )}
            </div>

            {/* Connector Lines (Pure CSS/SVG approach) */}
            {match.round < rounds.length && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-4 h-[2px] bg-slate-800" />
            )}
        </div>
    );

    return (
        <div className="w-full overflow-x-auto pb-8 scrollbar-hide">
            <div className="flex gap-12 px-4 min-w-max items-start">
                {rounds.map((round) => (
                    <div key={round.round} className="flex flex-col justify-around py-4">
                        <div className="mb-6 text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                {round.round === rounds.length ? 'Finals' : round.round === rounds.length - 1 ? 'Semi Finals' : `Round ${round.round}`}
                            </p>
                        </div>
                        <div className="space-y-12">
                            {round.matches.map((match) => (
                                <RoundMatch key={match.id} match={match} />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Winner Crown */}
                <div className="flex flex-col justify-center py-4 self-center ml-4">
                    <div className="w-20 h-20 rounded-full bg-primary-600/10 border-2 border-primary-500/30 flex items-center justify-center text-primary-400 shadow-[0_0_30px_rgba(14,165,233,0.2)]">
                        <Trophy size={32} />
                    </div>
                    <p className="text-[10px] font-black text-primary-500 uppercase text-center mt-3 tracking-widest">Champion</p>
                </div>
            </div>
        </div>
    );
};

export default BracketView;
