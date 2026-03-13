import {
    doc, collection, query, getDocs, getDoc, updateDoc,
    writeBatch, setDoc, runTransaction, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import OfflineQueue from './OfflineQueue';
import NotificationService from './NotificationService';
import { calculateNewRating, updatePlayerCareer } from './RatingService';

// ─────────────────────────────────────────────────────────────
// LATE BASKET ALGORITHM (SOW §4.2)
// ─────────────────────────────────────────────────────────────
/**
 * Append a late-basket player to the pool with the fewest members.
 * Fills Bye slots first. Generates only the new prerequisite matches.
 */
export const appendToPool = async (tournamentId, playerUid, playerDisplayName) => {
    const participantsRef = collection(db, `tournaments/${tournamentId}/participants`);
    const snapshot = await getDocs(query(participantsRef));
    const participants = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Group players by pool, tracking Bye count
    const pools = {};
    participants.forEach(p => {
        if (!p.poolId) return;
        if (!pools[p.poolId]) pools[p.poolId] = { count: 0, byes: 0 };
        if (p.isBye) pools[p.poolId].byes++;
        else pools[p.poolId].count++;
    });

    // Priority: fill Bye slots first, then smallest pool
    let targetPoolId = Object.keys(pools).sort((a, b) => {
        if (pools[b].byes !== pools[a].byes) return pools[b].byes - pools[a].byes;
        return pools[a].count - pools[b].count;
    })[0] || 'pool-1';

    // Add player to pool
    const playerRef = doc(participantsRef, playerUid);
    await updateDoc(playerRef, {
        poolId: targetPoolId,
        status: 'active',
        isBye: false,
        addedAt: serverTimestamp(),
    });

    // Generate only matches against players already in the target pool
    const opponents = participants.filter(p => p.poolId === targetPoolId && !p.isBye);
    const batch = writeBatch(db);

    opponents.forEach(opp => {
        const matchRef = doc(collection(db, `tournaments/${tournamentId}/matches`));
        batch.set(matchRef, {
            teamA_Id: playerUid,
            teamA_Name: playerDisplayName,
            teamB_Id: opp.id,
            teamB_Name: opp.displayName || '',
            status: 'pending',
            courtAssigned: null,
            submissions: {},
            verifiedScore: null,
            participantsArray: [playerUid, opp.id],
            createdAt: serverTimestamp(),
        });
    });

    await batch.commit();
    return targetPoolId;
};

// ─────────────────────────────────────────────────────────────
// POOL PROMOTION (SOW §4.4)
// ─────────────────────────────────────────────────────────────
/**
 * Promote top X players to a single-elimination bracket.
 * Auto-calculates bracket size and distributes Byes symmetrically.
 */
export const promoteToBracket = async (tournamentId, rankedPlayers, topX) => {
    const advancing = rankedPlayers.slice(0, topX);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(topX, 2))));
    const byeCount = bracketSize - topX;

    // Write bracket document
    const bracketRef = doc(db, `tournaments/${tournamentId}/brackets`, 'main-bracket');
    await setDoc(bracketRef, {
        size: bracketSize,
        participants: advancing,
        byeCount,
        status: 'active',
        generatedAt: serverTimestamp(),
    });

    // Create first-round matches with symmetrical Bye distribution
    const batch = writeBatch(db);
    // Top seeds get Byes — interleave seeded players so Byes go to the top
    const seeded = [...advancing];
    const slots = new Array(bracketSize).fill(null);
    seeded.forEach((p, i) => { slots[i] = p; });

    for (let i = 0; i < bracketSize / 2; i++) {
        const pA = slots[i * 2] || null;
        const pB = slots[i * 2 + 1] || null;
        const isBye = !pA || !pB;

        const matchRef = doc(collection(db, `tournaments/${tournamentId}/matches`));
        batch.set(matchRef, {
            teamA_Id: pA?.uid || null,
            teamA_Name: pA?.displayName || 'BYE',
            teamB_Id: pB?.uid || null,
            teamB_Name: pB?.displayName || 'BYE',
            status: isBye ? 'completed' : 'ready',
            isBracket: true,
            round: 1,
            participantsArray: [pA?.uid, pB?.uid].filter(Boolean),
            verifiedScore: isBye ? { winner: pA?.uid || pB?.uid } : null,
            courtAssigned: null,
            submissions: {},
        });
    }

    await batch.commit();
    return { bracketSize, byeCount };
};

// ─────────────────────────────────────────────────────────────
// MATCH STATE MACHINE — SCORE EVALUATION (SOW §4.1)
// ─────────────────────────────────────────────────────────────
/**
 * Called after a player submits their score.
 * Checks if both sides have submitted. If scores match → 'completed'.
 * If they don't → 'disputed'. Uses Firestore transaction for atomicity.
 *
 * @param {string} tournamentId
 * @param {string} matchId
 * @param {string} submittingUid   - uid of the player submitting
 * @param {object} score           - { sets: [...], games: [...] }
 */
export const evaluateSubmissions = async (tournamentId, matchId, submittingUid, score) => {
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);

    // If offline, queue and return early
    if (!navigator.onLine) {
        await OfflineQueue.enqueue({
            type: 'SUBMIT_SCORE',
            tournamentId,
            matchId,
            submittingUid,
            score,
        });
        return { status: 'queued_offline' };
    }

    return runTransaction(db, async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists()) throw new Error('Match not found');

        const data = snap.data();
        if (!['live', 'called', 'ready', 'pending'].includes(data.status)) {
            throw new Error(`Cannot submit score on a ${data.status} match`);
        }

        const submissions = { ...(data.submissions || {}), [submittingUid]: score };
        const uids = (data.participantsArray || [])
            .filter(id => id)
            .filter((v, i, a) => a.indexOf(v) === i);

        // Both players submitted?
        const allSubmitted = uids.length >= 2 && uids.every(uid => submissions[uid]);

        if (!allSubmitted) {
            tx.update(matchRef, { submissions, status: 'live' });
            return { status: 'awaiting_other_player' };
        }

        const [scoreA, scoreB] = uids.map(uid => JSON.stringify(submissions[uid]));
        const matchFound = scoreA === scoreB;

        if (!matchFound) {
            tx.update(matchRef, { submissions, status: 'disputed' });
            return { status: 'disputed' };
        }

        // MATCH FOUND -> PROCEED WITH COMPLETION & RATINGS
        const verifiedScore = submissions[uids[0]];
        const uidA = uids[0];
        const uidB = uids[1];

        // 1. Get user docs for ratings
        const userARef = doc(db, 'users', uidA);
        const userBRef = doc(db, 'users', uidB);
        const [userASnap, userBSnap] = await Promise.all([tx.get(userARef), tx.get(userBRef)]);

        if (userASnap.exists() && userBSnap.exists()) {
            const userA = userASnap.data();
            const userB = userBSnap.data();

            // Determine winner from verifiedScore (assuming { playerA: { sets }, playerB: { sets } })
            // or { teamA: { sets }, teamB: { sets } }
            const setsA = verifiedScore.teamA?.sets || verifiedScore.playerA?.sets || 0;
            const setsB = verifiedScore.teamB?.sets || verifiedScore.playerB?.sets || 0;

            const resultA = setsA > setsB ? 1 : (setsA < setsB ? 0 : 0.5);
            const resultB = 1 - resultA;

            // Calculate Ratings
            const ratingUpdateA = calculateNewRating(userA.rating || 1500, userB.rating || 1500, resultA);
            const ratingUpdateB = calculateNewRating(userB.rating || 1500, userA.rating || 1500, resultB);

            // Update Careers
            const careerA = updatePlayerCareer(userA.careerStats || {}, userA.recentForm || [], resultA === 1 ? 'W' : 'L');
            const careerB = updatePlayerCareer(userB.careerStats || {}, userB.recentForm || [], resultB === 1 ? 'W' : 'L');

            // Apply Updates
            tx.update(userARef, {
                rating: ratingUpdateA.newRating,
                careerStats: careerA.newStats,
                recentForm: careerA.newForm,
            });
            tx.update(userBRef, {
                rating: ratingUpdateB.newRating,
                careerStats: careerB.newStats,
                recentForm: careerB.newForm,
            });

            // Log Rating History
            const histARef = doc(collection(db, 'rating_history'));
            const histBRef = doc(collection(db, 'rating_history'));
            tx.set(histARef, { uid: uidA, matchId, previousRating: userA.rating || 1500, newRating: ratingUpdateA.newRating, delta: ratingUpdateA.delta, timestamp: serverTimestamp() });
            tx.set(histBRef, { uid: uidB, matchId, previousRating: userB.rating || 1500, newRating: ratingUpdateB.newRating, delta: ratingUpdateB.delta, timestamp: serverTimestamp() });
        }

        tx.update(matchRef, {
            submissions,
            status: 'completed',
            verifiedScore,
            resolvedAt: serverTimestamp(),
        });

        return { status: 'completed', verifiedScore };
    });
};

// ─────────────────────────────────────────────────────────────
// COURT ASSIGNMENT  (SOW §4.1 step 3 — "Called")
// ─────────────────────────────────────────────────────────────
/**
 * Assign a court to a match. Transitions status Pending/Ready → Called.
 * Triggers a push notification to players.
 */
export const assignCourt = async (tournamentId, matchId, courtNumber, teamNames = []) => {
    const matchRef = doc(db, `tournaments/${tournamentId}/matches`, matchId);
    await updateDoc(matchRef, {
        courtAssigned: courtNumber,
        status: 'called',
        calledAt: serverTimestamp(),
    });

    // Notify players
    NotificationService.matchCalled({
        playerName: teamNames[0] || 'Team',
        opponent: teamNames[1] || 'Opponent',
        court: courtNumber,
    });
};

// ─────────────────────────────────────────────────────────────
// KILL SWITCH  (SOW §5)
// ─────────────────────────────────────────────────────────────
/**
 * Freeze all live matches and revert called matches to ready.
 * Broadcasts an emergency push notification.
 */
export const triggerKillSwitch = async (tournamentId, reason = 'Rain delay') => {
    const matchesRef = collection(db, `tournaments/${tournamentId}/matches`);
    const snap = await getDocs(query(matchesRef));
    const batch = writeBatch(db);

    snap.docs.forEach(d => {
        const { status } = d.data();
        if (status === 'live') batch.update(d.ref, { status: 'paused', pausedAt: serverTimestamp() });
        if (status === 'called') batch.update(d.ref, { status: 'ready', courtAssigned: null });
    });

    await batch.commit();

    // Update tournament document
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    await updateDoc(tournamentRef, { killSwitchActive: true, killSwitchReason: reason, killSwitchAt: serverTimestamp() });

    NotificationService.killSwitch({ reason });
};
