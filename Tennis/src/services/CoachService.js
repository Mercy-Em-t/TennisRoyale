import { db } from './firebase';
import {
    collection, doc, getDoc, setDoc,
    query, where, getDocs, serverTimestamp
} from 'firebase/firestore';
import TeamService from './TeamService';

export const CoachService = {
    /**
     * Bulk registers a roster of teams.
     * Each entry in teamRoster can be a single player or a pair.
     */
    bulkRegisterTeams: async (coachId, tournamentId, teamRoster) => {
        const results = { newlyCreated: [], linked: [], errors: [] };

        for (const entry of teamRoster) {
            try {
                const memberUids = [];
                const memberNames = [];
                // Process each player in the team entry
                for (const player of entry.players) {
                    const userQuery = query(collection(db, 'users'), where('email', '==', player.email));
                    const userSnap = await getDocs(userQuery);

                    let uid;
                    if (!userSnap.empty) {
                        uid = userSnap.docs[0].id;
                        results.linked.push(player.name);
                    } else {
                        uid = `shadow_${Math.random().toString(36).substr(2, 9)}`;
                        await setDoc(doc(db, 'users', uid), {
                            uid,
                            displayName: player.name,
                            email: player.email,
                            role: 'player',
                            isShadow: true,
                            claimStatus: 'pending',
                            coachId,
                            createdAt: serverTimestamp()
                        });
                        results.newlyCreated.push(player.name);
                    }
                    memberUids.push(uid);
                    memberNames.push(player.name);
                }

                // Create the Team
                const team = await TeamService.createTeam(
                    memberUids,
                    entry.teamName || null,
                    coachId,
                    memberNames
                );

                // Register the Team to Tournament
                await TeamService.registerTeam(team.id, tournamentId);

            } catch (err) {
                console.error("Bulk team register error:", err);
                results.errors.push(entry.teamName || "Unknown Team");
            }
        }

        return results;
    },

    /**
     * Checks if a shadow account exists for the given email.
     */
    checkShadowAccount: async (email) => {
        const q = query(collection(db, 'users'), where('email', '==', email), where('isShadow', '==', true));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data();
    },

    /**
     * Converts a shadow account into a full account.
     */
    claimAccount: async (uid, password) => {
        // In a real app, this would involve Firebase auth.updateUser
        // For the demo, we mark it as no longer a shadow.
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, {
            isShadow: false,
            claimStatus: 'claimed',
            claimedAt: serverTimestamp()
        }, { merge: true });
    },

    /**
     * Fetches all athletes registered by or assigned to a coach.
     */
    getRoster: async (coachId) => {
        const q = query(collection(db, 'users'), where('coachId', '==', coachId));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    /**
     * Fetches all upcoming matches for a coach's entire roster.
     */
    getTeamSchedule: async (coachId) => {
        const roster = await CoachService.getRoster(coachId);
        const uids = roster.map(a => a.id);

        if (uids.length === 0) return [];

        // Query matches where any participant is in the coach's roster
        // In Firestore, 'array-contains-any' is limited to 10 items.
        // For a larger roster, we'd need to chunk this or use a different indexing strategy.
        const q = query(
            collection(db, 'matches'),
            where('participantsArray', 'array-contains-any', uids.slice(0, 10))
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    /**
     * Allows a coach to check-in an athlete for a specific match.
     */
    proxyCheckIn: async (coachId, athleteId, matchId) => {
        const matchRef = doc(db, 'matches', matchId);
        await setDoc(matchRef, {
            [`checkedIn_${athleteId}`]: {
                status: true,
                witnessedBy: coachId,
                type: 'coach_proxy',
                timestamp: serverTimestamp()
            }
        }, { merge: true });
    }
};

export default CoachService;
