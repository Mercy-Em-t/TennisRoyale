/**
 * triggerKillSwitch — Callable Cloud Function
 * ─────────────────────────────────────────────────────────────
 * SOW §5 — "Global Kill Switch (Rain Delay)"
 *
 * Freezes ALL live matches and reverts called → ready.
 * Broadcasts an emergency push notification to all tournament participants.
 * Only the tournament Host or an Admin can call this.
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";

interface KillSwitchPayload {
    tournamentId: string;
    reason?: string;
    active: boolean;  // true = freeze, false = resume
}

export const triggerKillSwitch = functions.https.onCall<KillSwitchPayload>(
    { region: "us-central1" },
    async (request) => {
        // ── Auth guard ────────────────────────────────────────────
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        }

        const callerId = request.auth.uid;
        const { tournamentId, reason = "Rain delay", active } = request.data;

        const db = admin.firestore();

        // ── Role check: caller must be the tournament host or an Admin ──
        const [tournamentSnap, userSnap] = await Promise.all([
            db.collection("tournaments").doc(tournamentId).get(),
            db.collection("users").doc(callerId).get(),
        ]);

        if (!tournamentSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Tournament not found.");
        }

        const tournament = tournamentSnap.data()!;
        const user = userSnap.data();
        const isHost = tournament.hostId === callerId;
        const isAdmin = user?.role === "admin";

        if (!isHost && !isAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Only the tournament Host or an Admin can activate the Kill Switch."
            );
        }

        // ── Batch update all affected matches ─────────────────────
        const matchesRef = db.collection(`tournaments/${tournamentId}/matches`);
        const matchesSnap = await matchesRef.get();

        const batch = db.batch();
        let affected = 0;

        matchesSnap.docs.forEach((d) => {
            const status = d.data().status as string;

            if (active) {
                // FREEZE: live → paused, called → ready
                if (status === "live") {
                    batch.update(d.ref, { status: "paused", pausedAt: FieldValue.serverTimestamp() });
                    affected++;
                } else if (status === "called") {
                    batch.update(d.ref, { status: "ready", courtAssigned: null });
                    affected++;
                }
            } else {
                // RESUME: paused → live
                if (status === "paused") {
                    batch.update(d.ref, { status: "live", resumedAt: FieldValue.serverTimestamp() });
                    affected++;
                }
            }
        });

        await batch.commit();

        // ── Update tournament document ────────────────────────────
        await tournamentSnap.ref.update({
            killSwitchActive: active,
            killSwitchReason: active ? reason : null,
            killSwitchAt: FieldValue.serverTimestamp(),
        });

        // ── Send FCM topic message to all tournament participants ──
        // Participants subscribe to topic `tournament_{tournamentId}` on join
        const topicMessage = active
            ? {
                notification: {
                    title: "⚠️ Tournament Suspended",
                    body: `${reason} — All matches have been paused. Stand by for further instructions.`,
                },
                topic: `tournament_${tournamentId}`,
            }
            : {
                notification: {
                    title: "✅ Tournament Resumed",
                    body: "Play has resumed. Check your schedule for updated court assignments.",
                },
                topic: `tournament_${tournamentId}`,
            };

        try {
            await admin.messaging().send(topicMessage);
            logger.info("Kill switch notification sent", { tournamentId, active });
        } catch (err) {
            // FCM failure should not block the response — log and continue
            logger.warn("FCM notification failed", { err });
        }

        logger.info("Kill switch executed", { tournamentId, active, affected, callerId });
        return { success: true, affected };
    }
);
