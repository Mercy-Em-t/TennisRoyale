import { db } from './firebase';
import {
    doc, updateDoc, setDoc,
    serverTimestamp, collection,
    query, where, getDocs
} from 'firebase/firestore';

/**
 * SuperService provides "God Mode" capabilities for System Managers.
 */
export const SuperService = {
    /**
     * Globally overrides any tournament setting or status.
     */
    overrideTournament: async (managerId, tournamentId, updates) => {
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        await updateDoc(tournamentRef, {
            ...updates,
            lastOverriddenBy: managerId,
            overrideTimestamp: serverTimestamp()
        });
    },

    /**
     * Acting as a Proxy for another user.
     * Records the action in a specialized 'proxy_logs' collection.
     */
    logProxyAction: async (managerId, targetUid, actionType, details) => {
        const logRef = doc(collection(db, 'proxy_logs'));
        await setDoc(logRef, {
            managerId,
            targetUid,
            actionType,
            details,
            timestamp: serverTimestamp()
        });
    },

    /**
     * Search for users across all roles and status.
     */
    globalUserSearch: async (searchTerm) => {
        const q = query(collection(db, 'users'), where('displayName', '>=', searchTerm));
        const snap = await getDocs(q);
        return snap.docs.map(doc => doc.data());
    }
};

export default SuperService;
