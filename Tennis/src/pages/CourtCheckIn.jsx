import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MapPin, Zap, Users, Trophy, ChevronRight, QrCode, Wifi } from 'lucide-react';

/**
 * CourtCheckIn — QR scan destination
 * ─────────────────────────────────────────────────────────────
 * Reached by scanning a court-specific QR code.
 * Shows: court status, current/next match, check-in prompt.
 *
 * Route: /court/:tournamentId/:courtId
 */

const MOCK_COURTS = {
    '1': {
        courtId: '1',
        name: 'Center Court',
        surface: 'Hard',
        currentMatch: {
            id: 'm1',
            playerA_Name: 'R. Federer',
            playerB_Name: 'R. Nadal',
            status: 'live',
            score: '6-4, 3-2',
        },
        nextMatch: {
            id: 'm3',
            playerA_Name: 'Dev Player',
            playerB_Name: 'A. Murray',
            scheduledTime: '16:00',
        },
    },
    '2': {
        courtId: '2',
        name: 'Court 2',
        surface: 'Clay',
        currentMatch: {
            id: 'm2',
            playerA_Name: 'N. Djokovic',
            playerB_Name: 'C. Alcaraz',
            status: 'live',
            score: '7-6, 1-0',
        },
        nextMatch: null,
    },
};

const CourtCheckIn = () => {
    const { tournamentId, courtId } = useParams();
    const [court, setCourt] = useState(MOCK_COURTS[courtId] || null);
    const [tournament, setTournament] = useState(null);
    const [checkedIn, setCheckedIn] = useState(false);

    useEffect(() => {
        try {
            const tRef = doc(db, 'tournaments', tournamentId);
            const unsub = onSnapshot(tRef, snap => {
                if (snap.exists()) setTournament({ id: snap.id, ...snap.data() });
            }, () => { });
            return () => unsub();
        } catch (_) { }
    }, [tournamentId]);

    useEffect(() => {
        // In production: listen to court document in Firestore
        // For now: use mock data if not overridden
        if (!court) setCourt({
            courtId,
            name: `Court ${courtId}`,
            surface: 'Hard',
            currentMatch: null,
            nextMatch: null,
        });
    }, [courtId]);

    const handleCheckIn = () => {
        setCheckedIn(true);
        // In production: write check-in to Firestore participant doc
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100">
            <div className="max-w-sm mx-auto px-4 py-8 space-y-6">

                {/* Court Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-6 text-center space-y-3 border-t-4 border-primary-500"
                >
                    <div className="w-16 h-16 bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto">
                        <MapPin size={32} className="text-primary-400" />
                    </div>
                    <h1 className="text-2xl font-black">{court?.name || `Court ${courtId}`}</h1>
                    {court?.surface && (
                        <span className="text-xs bg-slate-800 rounded-full px-3 py-1 text-slate-400 font-bold">
                            {court.surface} Surface
                        </span>
                    )}
                    {tournament && (
                        <p className="text-sm text-slate-400">{tournament.name}</p>
                    )}
                </motion.div>

                {/* Current Match */}
                {court?.currentMatch && (
                    <section>
                        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> On Court Now
                        </h2>
                        <div className="glass-card rounded-2xl p-5 border border-green-500/20 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold">{court.currentMatch.playerA_Name}</span>
                                <div className="text-center">
                                    <div className="text-sm font-black bg-slate-800 rounded-xl px-3 py-1 text-primary-400">
                                        {court.currentMatch.score || 'LIVE'}
                                    </div>
                                </div>
                                <span className="font-bold">{court.currentMatch.playerB_Name}</span>
                            </div>
                            <Link
                                to={`/match/${tournamentId}/${court.currentMatch.id}`}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 rounded-xl text-xs font-bold text-primary-400 hover:bg-slate-700 transition-all min-h-0"
                            >
                                <Zap size={14} /> Watch Live Scoreboard
                            </Link>
                        </div>
                    </section>
                )}

                {/* Next Match */}
                {court?.nextMatch && (
                    <section>
                        <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">Up Next</h2>
                        <div className="glass-card rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between text-sm font-bold">
                                <span>{court.nextMatch.playerA_Name}</span>
                                <span className="text-slate-500">vs</span>
                                <span>{court.nextMatch.playerB_Name}</span>
                            </div>
                            <p className="text-xs text-slate-500 text-center">⏰ {court.nextMatch.scheduledTime}</p>
                        </div>
                    </section>
                )}

                {/* Check In */}
                {!checkedIn ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-400 text-center">
                            Are you playing on this court? Check in to confirm your arrival.
                        </p>
                        <button
                            onClick={handleCheckIn}
                            className="w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-black text-base transition-all shadow-lg shadow-primary-900/30"
                        >
                            ✓ Check In to {court?.name || `Court ${courtId}`}
                        </button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-card rounded-2xl p-6 text-center border border-green-500/30 space-y-2"
                    >
                        <div className="text-4xl">✅</div>
                        <p className="font-black text-green-400">Checked In!</p>
                        <p className="text-xs text-slate-400">Your arrival has been logged. Good luck!</p>
                    </motion.div>
                )}

                {/* Back to tournament */}
                <Link
                    to={`/tournament/${tournamentId}`}
                    className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors min-h-0 py-2"
                >
                    <Trophy size={14} /> Back to Tournament
                </Link>
            </div>
        </div>
    );
};

export default CourtCheckIn;
