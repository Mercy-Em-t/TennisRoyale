import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// ─────────────────────────────────────────────────────────────
// Firebase Configuration
// Replace these values with your actual Firebase project config.
// In production set them in a .env file:
//   VITE_FIREBASE_API_KEY=...
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
const auth = getAuth(app);

// ─────────────────────────────────────────────────────────────
// Firestore — with persistent multi-tab offline cache
// Uses the modern `persistentLocalCache` API (replaces deprecated
// enableIndexedDbPersistence) available in Firebase JS SDK v9.19+
// ─────────────────────────────────────────────────────────────
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
});

// ─────────────────────────────────────────────────────────────
// Cloud Messaging (optional — only initialised if browser supports it)
// ─────────────────────────────────────────────────────────────
let messaging = null;
isSupported().then((supported) => {
    if (supported) {
        messaging = getMessaging(app);
    }
}).catch(() => { });

export { auth, db, messaging };
