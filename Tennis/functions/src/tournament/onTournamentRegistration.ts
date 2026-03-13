/**
 * onTournamentRegistration — Firestore Trigger
 * ─────────────────────────────────────────────────────────────
 * Fires when a new participant document is created in a tournament.
 * Handles:
 *   1. Sending a "Welcome" push notification to the player
 *   2. Subscribing the player's FCM token to the tournament topic
 *   3. Incrementing the tournament's participantCount
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";

export const onTournamentRegistration = onDocumentCreated(
    {
        document: "tournaments/{tournamentId}/participants/{uid}",
        region: "us-central1",
    },
    async (event) => {
        const { tournamentId, uid } = event.params;
        const db = admin.firestore();

        // Increment participant count atomically
        await db.collection("tournaments").doc(tournamentId).update({
            participantCount: FieldValue.increment(1),
        });

        // Get user's FCM token and tournament name for notification
        const [userSnap, tournamentSnap] = await Promise.all([
            db.collection("users").doc(uid).get(),
            db.collection("tournaments").doc(tournamentId).get(),
        ]);

        const user = userSnap.data();
        const tournament = tournamentSnap.data();
        const fcmToken = user?.fcmToken;

        if (fcmToken && tournament) {
            try {
                // Subscribe to tournament topic for group notifications
                await admin.messaging().subscribeToTopic(fcmToken, `tournament_${tournamentId}`);

                // Welcome notification
                await admin.messaging().send({
                    token: fcmToken,
                    notification: {
                        title: `🎾 You're in: ${tournament.name}`,
                        body: "Registration confirmed. Check your Feed for your pool assignment.",
                    },
                });

                logger.info("Welcome notification sent", { uid, tournamentId });
            } catch (err) {
                logger.warn("Failed to send registration notification", { err, uid });
            }
        }
    }
);
