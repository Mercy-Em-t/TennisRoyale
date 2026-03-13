import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const ROLES = {
    PLAYER: 'player',
    HOST: 'host',
    OFFICIAL: 'official',
    ADMIN: 'admin',
    COACH: 'coach',
    VOLUNTEER: 'volunteer',
    SPECTATOR: 'spectator',
    SYSTEM_MANAGER: 'system_manager',
};

// ─────────────────────────────────────────────────────────────
// DEV_MODE: set true to bypass Firebase auth (local dev/testing).
// Set to false — or use VITE_DEV_MODE=false in your .env — for
// production or when you have real Firebase credentials.
// ─────────────────────────────────────────────────────────────
const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'false'
    ? false
    : true;   // defaults to true until credentials are configured

const DEV_USER = {
    uid: 'dev-user-001',
    displayName: 'Dev Player',
    email: 'dev@tennisroyale.app',
    photoURL: null,
};

// ─────────────────────────────────────────────────────────────
// Helper — create or update the Firestore user document
// ─────────────────────────────────────────────────────────────
const upsertUserDoc = async (user, overrides = {}) => {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            uid: user.uid,
            displayName: user.displayName || overrides.displayName || 'Anonymous Player',
            email: user.email || '',
            role: ROLES.PLAYER,
            createdAt: serverTimestamp(),
            rating: 1500,
            careerStats: { matchesPlayed: 0, wins: 0, losses: 0, titles: 0, bestRanking: null },
            recentForm: [],
            clubs: [],
            ...overrides,
        });
        return ROLES.PLAYER;
    }
    return snap.data().role || ROLES.PLAYER;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null); // Added local userData state
    const [userRole, setUserRole] = useState(ROLES.PLAYER);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    // ── Role switching ──────────────────────────────────────
    const switchRole = async (newRole) => {
        if (!Object.values(ROLES).includes(newRole)) return;
        setUserRole(newRole);
        if (!DEV_MODE && currentUser) {
            const ref = doc(db, 'users', currentUser.uid);
            await updateDoc(ref, { role: newRole });
        }
    };

    // ── Update User Data (Settings/Profile) ─────────────────
    const updateUserData = async (updates) => {
        if (!currentUser) return;

        // Optimistic local update
        setUserData(prev => ({ ...prev, ...updates }));

        if (!DEV_MODE) {
            const ref = doc(db, 'users', currentUser.uid);
            await updateDoc(ref, updates);
        }
    };

    // ── Sign up with email/password ─────────────────────────
    const register = async ({ displayName, email, password }) => {
        setAuthError(null);
        localStorage.removeItem('tennis_logged_out');
        if (DEV_MODE) {
            const user = { ...DEV_USER, displayName, email };
            setCurrentUser(user);
            setUserRole(ROLES.PLAYER);
            return user;
        }
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(user, { displayName });
        await upsertUserDoc(user, { displayName });
        return user;
    };

    // ── Sign in with email/password ─────────────────────────
    const login = async ({ email, password }) => {
        setAuthError(null);
        localStorage.removeItem('tennis_logged_out');
        if (DEV_MODE) {
            setCurrentUser(DEV_USER);
            setUserRole(ROLES.PLAYER);
            return DEV_USER;
        }
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        return user;
    };

    // ── Sign in as Guest ─────────────────────────────
    const loginAsGuest = async () => {
        setAuthError(null);
        localStorage.removeItem('tennis_logged_out');
        if (DEV_MODE) {
            setCurrentUser(DEV_USER);
            setUserRole(ROLES.PLAYER);
            return DEV_USER;
        }
        const { user } = await signInAnonymously(auth);
        await upsertUserDoc(user, { displayName: 'Guest Player' });
        return user;
    };

    // ── Sign out ────────────────────────────────────────────
    const logout = async () => {
        if (!DEV_MODE) {
            await signOut(auth);
        } else {
            localStorage.setItem('tennis_logged_out', 'true');
        }
        setCurrentUser(null);
        setUserRole(ROLES.PLAYER);
    };

    // ── Auth state listener ─────────────────────────────────
    useEffect(() => {
        if (DEV_MODE) {
            const wasLoggedOut = localStorage.getItem('tennis_logged_out') === 'true';
            if (!wasLoggedOut) {
                setCurrentUser(DEV_USER);
                setUserRole(ROLES.PLAYER);
                setUserData({
                    uid: DEV_USER.uid,
                    displayName: DEV_USER.displayName,
                    email: DEV_USER.email,
                    role: ROLES.PLAYER,
                    settings: {
                        notifications: { push: true, email: false, reminders: '30min', updates: true, mentions: true },
                        privacy: { publicProfile: true, allowInvites: true, twoFactor: false },
                        preferences: { theme: 'dark', language: 'en-US', homeTab: 'events', dateFormat: 'MM/DD/YYYY' },
                    }
                });
            } else {
                setCurrentUser(null);
                setUserRole(ROLES.PLAYER);
                setUserData(null);
            }
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    setCurrentUser(user);
                    const role = await upsertUserDoc(user);
                    setUserRole(role);

                    // Fetch full user doc
                    const snap = await getDoc(doc(db, 'users', user.uid));
                    if (snap.exists()) {
                        setUserData(snap.data());
                    }
                } else {
                    setCurrentUser(null);
                    setUserRole(ROLES.PLAYER);
                    setUserData(null);
                }
            } catch (err) {
                console.error('AuthContext error:', err);
            } finally {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userData, // Exported user document including settings
        userRole,
        switchRole,
        updateUserData, // Exported updater function
        register,
        login,
        loginAsGuest,
        logout,
        loading,
        authError,
        setAuthError,
        isDevMode: DEV_MODE,
        ROLES,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
