import { db } from './firebase';
import {
    collection, doc, getDoc, setDoc,
    query, where, getDocs, serverTimestamp,
    addDoc
} from 'firebase/firestore';

export const TeamService = {
    /**
     * Creates a team for a specific category.
     * Members can be 1 (Singles) or more.
     * memberNames is an optional array of names to use for auto-naming.
     */
    createTeam: async (memberUids, teamName = null, coachId = null, memberNames = []) => {
        let finalName = teamName;
        
        if (!finalName) {
            if (memberNames && memberNames.length > 0) {
                finalName = memberNames.join(' & ');
            } else {
                finalName = memberUids.length === 1 ? 'Single Player' : `Team (${memberUids.length})`;
            }
        }

        const teamData = {
            members: memberUids, // Array of UIDs
            name: finalName,
            coachId: coachId,
            createdAt: serverTimestamp(),
            size: memberUids.length
        };

        const docRef = await addDoc(collection(db, 'teams'), teamData);
        return { id: docRef.id, ...teamData };
    },

    /**
     * Registers a team for a tournament.
     */
    registerTeam: async (teamId, tournamentId) => {
        const registrationRef = doc(db, 'tournaments', tournamentId, 'entries', teamId);
        await setDoc(registrationRef, {
            teamId: teamId,
            registeredAt: serverTimestamp(),
            status: 'pending_approval'
        });
    }
};

export default TeamService;
