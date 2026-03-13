/**
 * useMyMatches — Real-time Firestore listener
 * ─────────────────────────────────────────────────────────────
 * Returns all matches across all tournaments where the current user
 * is a participant (participantsArray contains currentUser.uid).
 *
 * Since Firestore doesn't support cross-collection queries on sub-
 * collections, this hook uses a collectionGroup query on 'matches'
 * which requires a composite index in Firebase console.
 *
 * Firestore index required:
 *   Collection group: matches
 *   Fields: participantsArray (ASC), status (ASC)
 */

import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import {
    collectionGroup, query, where, onSnapshot, orderBy
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

/**
 * @param {string|null} filterStatus  - optional: 'upcoming'|'live'|'completed'|'disputed'
 * @param {number}      limitCount    - max results (default 20)
 */
const useMyMatches = (filterStatus = null, limitCount = 20) => {
    const { currentUser, isDevMode } = useAuth();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentUser) {
            setMatches([]);
            setLoading(false);
            return;
        }

        // Dev mode — return mock data, no Firestore needed
        if (isDevMode) {
            setMatches([
                {
                    id: 'mock-m1',
                    tournamentId: 't1',
                    tournamentName: 'Summer Open 2026',
                    playerA_Name: 'Dev Player',
                    playerB_Name: 'A. Murray',
                    courtAssigned: 3,
                    status: 'upcoming',
                    scheduledTime: '14:30',
                    participantsArray: ['dev-user-001', 'other'],
                },
                {
                    id: 'mock-m2',
                    tournamentId: 't1',
                    tournamentName: 'Summer Open 2026',
                    playerA_Name: 'Dev Player',
                    playerB_Name: 'S. Tsitsipas',
                    courtAssigned: 1,
                    status: 'upcoming',
                    scheduledTime: '16:00',
                    participantsArray: ['dev-user-001', 'other2'],
                },
                {
                    id: 'mock-m3',
                    tournamentId: 't1',
                    tournamentName: 'Summer Open 2026',
                    playerA_Name: 'Dev Player',
                    playerB_Name: 'R. Federer',
                    courtAssigned: 2,
                    status: 'completed',
                    verifiedScore: { playerA: { sets: 2, games: 12 }, playerB: { sets: 1, games: 9 } },
                    participantsArray: ['dev-user-001', 'other3'],
                },
            ]);
            setLoading(false);
            return;
        }

        try {
            // collectionGroup query across all tournament 'matches' sub-collections
            const constraints = [
                where('participantsArray', 'array-contains', currentUser.uid),
            ];
            if (filterStatus) constraints.push(where('status', '==', filterStatus));

            const q = query(collectionGroup(db, 'matches'), ...constraints);

            const unsub = onSnapshot(q, snap => {
                const data = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .slice(0, limitCount);
                setMatches(data);
                setLoading(false);
            }, err => {
                setError(err.message);
                setLoading(false);
            });

            return () => unsub();
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, [currentUser, filterStatus, limitCount, isDevMode]);

    const upcoming = matches.filter(m => m.status === 'upcoming' || m.status === 'called');
    const live = matches.filter(m => m.status === 'live');
    const completed = matches.filter(m => m.status === 'completed');

    return { matches, upcoming, live, completed, loading, error };
};

export default useMyMatches;
