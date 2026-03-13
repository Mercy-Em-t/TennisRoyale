/**
 * useMyStanding — Real-time pool standing for current user
 * ─────────────────────────────────────────────────────────────
 * Listens to the participant sub-collection for a given tournament
 * and calculates the current user's rank based on:
 *   Points > Set Ratio > Game Ratio   (SOW §4.4)
 */

import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const MOCK_STANDINGS = [
    { uid: 'dev-user-001', displayName: 'Dev Player', played: 3, won: 2, lost: 1, points: 6, setsWon: 5, setsLost: 3, gamesWon: 24, gamesLost: 18 },
    { uid: 'uid-002', displayName: 'R. Federer', played: 4, won: 4, lost: 0, points: 12, setsWon: 8, setsLost: 1, gamesWon: 36, gamesLost: 12 },
    { uid: 'uid-003', displayName: 'A. Murray', played: 4, won: 2, lost: 2, points: 6, setsWon: 4, setsLost: 5, gamesWon: 21, gamesLost: 24 },
    { uid: 'uid-004', displayName: 'S. Tsitsipas', played: 4, won: 0, lost: 4, points: 0, setsWon: 1, setsLost: 8, gamesWon: 10, gamesLost: 32 },
];

const rankStandings = (list) => {
    return [...list].sort((a, b) => {
        // 1. Points
        if (b.points !== a.points) return b.points - a.points;
        // 2. Set Ratio
        const aSetR = a.setsLost === 0 ? a.setsWon : a.setsWon / a.setsLost;
        const bSetR = b.setsLost === 0 ? b.setsWon : b.setsWon / b.setsLost;
        if (bSetR !== aSetR) return bSetR - aSetR;
        // 3. Game Ratio
        const aGameR = a.gamesLost === 0 ? a.gamesWon : a.gamesWon / a.gamesLost;
        const bGameR = b.gamesLost === 0 ? b.gamesWon : b.gamesWon / b.gamesLost;
        return bGameR - aGameR;
    });
};

/**
 * @param {string} tournamentId  - Firestore tournament document ID
 * @param {string|null} poolId   - optional pool filter
 */
const useMyStanding = (tournamentId, poolId = null) => {
    const { currentUser, isDevMode } = useAuth();
    const [standings, setStandings] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || !tournamentId) {
            setLoading(false);
            return;
        }

        if (isDevMode) {
            const ranked = rankStandings(MOCK_STANDINGS);
            setStandings(ranked);
            const idx = ranked.findIndex(p => p.uid === currentUser.uid);
            setMyRank(idx >= 0 ? idx + 1 : null);
            setMyStats(ranked[idx] || null);
            setLoading(false);
            return;
        }

        const ref = collection(db, `tournaments/${tournamentId}/participants`);
        const unsub = onSnapshot(ref, snap => {
            const raw = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
                .filter(p => !poolId || p.poolId === poolId);

            const ranked = rankStandings(raw);
            setStandings(ranked);

            const idx = ranked.findIndex(p => p.uid === currentUser.uid);
            setMyRank(idx >= 0 ? idx + 1 : null);
            setMyStats(ranked[idx] || null);
            setLoading(false);
        }, () => setLoading(false));

        return () => unsub();
    }, [currentUser, tournamentId, poolId, isDevMode]);

    return { standings, myRank, myStats, loading };
};

export default useMyStanding;
