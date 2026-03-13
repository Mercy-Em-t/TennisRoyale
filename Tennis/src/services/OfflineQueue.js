/**
 * OfflineQueue — IndexedDB-backed action queue
 * ─────────────────────────────────────────────────────────────
 * When the device is offline, score submissions and other writes
 * are stored here. On reconnection, the queue drains automatically.
 *
 * Usage:
 *   import OfflineQueue from '../services/OfflineQueue';
 *   await OfflineQueue.enqueue({ type: 'SUBMIT_SCORE', payload: { ... } });
 *   await OfflineQueue.flush(processFn);
 */

const DB_NAME = 'TennisRoyaleOfflineDB';
const DB_VER = 1;
const STORE = 'queue';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

const OfflineQueue = {
    /** Add an action to the queue */
    async enqueue(action) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.add({ ...action, enqueuedAt: Date.now() });
        return new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });
    },

    /** Get all queued actions */
    async getAll() {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.getAll();
        return new Promise((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
    },

    /** Count queued actions */
    async count() {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const store = tx.objectStore(STORE);
        const req = store.count();
        return new Promise((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
    },

    /** Delete a single action by its IDB id */
    async remove(id) {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.delete(id);
        return new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });
    },

    /**
     * Drain the queue — calls processFn(action) for each item.
     * Removes successfully processed items. Leaves failed items in place.
     */
    async flush(processFn) {
        const items = await this.getAll();
        for (const item of items) {
            try {
                await processFn(item);
                await this.remove(item.id);
            } catch (err) {
                console.warn('[OfflineQueue] Failed to process:', item, err);
            }
        }
    },

    /** Clear the entire queue (e.g. on logout) */
    async clear() {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        store.clear();
        return new Promise((res, rej) => {
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });
    },
};

export default OfflineQueue;
