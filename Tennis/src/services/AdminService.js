/**
 * AdminService — Firestore queries for System Admin
 * ─────────────────────────────────────────────────────────────
 * Read-heavy service for the System Manager dashboard.
 * All writes that elevate roles or suspend tournaments should go
 * through Cloud Functions in production.
 */

import { db } from './firebase';
import {
    collection, getDocs, query, where, orderBy, limit,
    doc, updateDoc, serverTimestamp, getCountFromServer,
} from 'firebase/firestore';

const AdminService = {

    /** Get all users, ordered by creation date */
    async getAllUsers(limitN = 50) {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(limitN));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Get all tournaments */
    async getAllTournaments(limitN = 50) {
        const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'), limit(limitN));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Get tournaments by status */
    async getTournamentsByStatus(status) {
        const q = query(collection(db, 'tournaments'), where('status', '==', status));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Elevate a user's role */
    async elevateRole(uid, newRole) {
        const ref = doc(db, 'users', uid);
        await updateDoc(ref, { role: newRole, roleElevatedAt: serverTimestamp() });
    },

    /** Suspend a tournament */
    async suspendTournament(tournamentId) {
        const ref = doc(db, 'tournaments', tournamentId);
        await updateDoc(ref, { status: 'suspended', suspendedAt: serverTimestamp() });
    },

    /** Get system-wide stats (user count, tournament count) */
    async getSystemStats() {
        const [userCount, tournamentCount, liveCount] = await Promise.all([
            getCountFromServer(collection(db, 'users')),
            getCountFromServer(collection(db, 'tournaments')),
            getCountFromServer(query(collection(db, 'tournaments'), where('status', '==', 'live'))),
        ]);
        return {
            totalUsers: userCount.data().count,
            totalTournaments: tournamentCount.data().count,
            liveTournaments: liveCount.data().count,
        };
    },

    /** Get ledger entries (listing fees) */
    async getLedgerEntries(limitN = 100) {
        const q = query(collection(db, 'ledger'), orderBy('createdAt', 'desc'), limit(limitN));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Record a listing fee in the ledger */
    async recordListingFee({ tournamentId, hostId, amount, currency = 'USD' }) {
        const { addDoc } = await import('firebase/firestore');
        await addDoc(collection(db, 'ledger'), {
            type: 'listing_fee',
            tournamentId,
            hostId,
            amount,
            currency,
            status: 'paid',
            createdAt: serverTimestamp(),
        });
    },
};

export default AdminService;
