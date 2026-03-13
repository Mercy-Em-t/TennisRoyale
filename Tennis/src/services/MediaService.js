import { db } from './firebase';
import {
    collection, addDoc, query, orderBy,
    limit, onSnapshot, serverTimestamp
} from 'firebase/firestore';

/**
 * MediaService
 * Stub service for handling tournament highlights, media uploads, 
 * and public spectator content.
 */
export const MediaService = {
    /**
     * Fetches recent global highlights for the spectator feed.
     */
    getHighlights: (callback) => {
        const q = query(
            collection(db, 'highlights'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        return onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(data);
        });
    },

    /**
     * Stubs a media upload from a spectator or official.
     */
    uploadMedia: async (userId, tournamentId, mediaData) => {
        return await addDoc(collection(db, 'highlights'), {
            ...mediaData,
            userId,
            tournamentId,
            createdAt: serverTimestamp(),
            likes: 0,
            views: 0
        });
    }
};

export default MediaService;
