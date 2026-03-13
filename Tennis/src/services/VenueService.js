import { db } from './firebase';
import {
    doc, collection, query, getDocs, getDoc,
    setDoc, updateDoc, serverTimestamp, where
} from 'firebase/firestore';

/**
 * VenueService.js
 * 
 * Manages physical clubs, facilities, and courts.
 * Anchors tournaments to venues for the Ecosystem-driven network.
 */

/**
 * Create a new Venue (Club/Facility).
 */
export const createVenue = async (venueData) => {
    const venueRef = doc(collection(db, 'venues'));
    const data = {
        ...venueData,
        id: venueRef.id,
        createdAt: serverTimestamp(),
        verified: false,
        activeTournaments: [],
        courtCount: venueData.courtCount || 1,
    };
    await setDoc(venueRef, data);
    return data;
};

/**
 * Get all verified venues.
 */
export const getVerifiedVenues = async () => {
    const q = query(collection(db, 'venues'), where('verified', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Get a specific venue by ID.
 */
export const getVenue = async (venueId) => {
    const ref = doc(db, 'venues', venueId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
};

/**
 * Assign a tournament to a venue.
 */
export const linkTournamentToVenue = async (tournamentId, venueId) => {
    const tRef = doc(db, 'tournaments', tournamentId);
    const vRef = doc(db, 'venues', venueId);

    await updateDoc(tRef, { venueId });

    // Add to venue's active list
    const vSnap = await getDoc(vRef);
    if (vSnap.exists()) {
        const active = vSnap.data().activeTournaments || [];
        if (!active.includes(tournamentId)) {
            await updateDoc(vRef, {
                activeTournaments: [...active, tournamentId]
            });
        }
    }
};

export default {
    createVenue,
    getVerifiedVenues,
    getVenue,
    linkTournamentToVenue,
};
