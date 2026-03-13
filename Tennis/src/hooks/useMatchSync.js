import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const MATCH_STATES = {
    PENDING: 'pending',
    READY: 'ready',
    CALLED: 'called',
    LIVE: 'live',
    COMPLETED: 'completed',
    DISPUTED: 'disputed'
};

export const useMatchSync = (tournamentId, matchId) => {
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tournamentId || !matchId) return;

        const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
        const unsubscribe = onSnapshot(matchRef, (doc) => {
            if (doc.exists()) {
                setMatchData({ id: doc.id, ...doc.data() });
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tournamentId, matchId]);

    const submitScore = async (userId, score) => {
        if (!matchData) return;

        const matchRef = doc(db, `tournaments/${tournamentId}/matches/${matchId}`);
        const newSubmissions = { ...matchData.submissions, [userId]: score };

        // Check for match
        const playerIds = Object.keys(newSubmissions);
        let newState = MATCH_STATES.LIVE;
        let verifiedScore = null;

        if (playerIds.length === 2) {
            const [p1, p2] = playerIds;
            const s1 = newSubmissions[p1];
            const s2 = newSubmissions[p2];

            // Deep equality check for score submission
            if (JSON.stringify(s1) === JSON.stringify(s2)) {
                newState = MATCH_STATES.COMPLETED;
                verifiedScore = s1;
            } else {
                newState = MATCH_STATES.DISPUTED;
            }
        }

        await updateDoc(matchRef, {
            submissions: newSubmissions,
            status: newState,
            verifiedScore: verifiedScore
        });
    };

    const resolveDispute = async (finalScore) => {
        const matchRef = doc(db, `tournaments/${tournamentId}/matches/${matchId}`);
        await updateDoc(matchRef, {
            status: MATCH_STATES.COMPLETED,
            verifiedScore: finalScore,
            resolvedBy: 'host_override'
        });
    };

    return { matchData, loading, submitScore, resolveDispute };
};
