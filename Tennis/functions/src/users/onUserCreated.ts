/**
 * onUserCreated — Firebase Auth Trigger
 * ─────────────────────────────────────────────────────────────
 * Fires when a new user signs up via Firebase Auth.
 * Creates their Firestore user document automatically — no client
 * write needed. This is the server-authoritative alternative to
 * the client-side upsertUserDoc() in AuthContext.
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const db = admin.firestore();

    try {
        await db.collection("users").doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName || user.email?.split("@")[0] || "New Player",
            email: user.email || "",
            photoURL: user.photoURL || null,
            role: "player",          // everyone starts as a player
            createdAt: FieldValue.serverTimestamp(),
            globalStats: {
                matchesPlayed: 0,
                wins: 0,
                losses: 0,
                trophies: 0,
            },
        });

        logger.info("User document created", { uid: user.uid, email: user.email });
    } catch (err) {
        logger.error("Failed to create user document", { uid: user.uid, err });
    }
});
