/**
 * onMatchCompleted — Firestore Trigger
 * ─────────────────────────────────────────────────────────────
 * Fires automatically when a match document transitions to 'completed'.
 * Handles bracket progression: promotes the winner to the next round.
 *
 * SOW §4.1 — "NEXT STEP: Trigger another function to promote winner
 * to next bracket round."
 */

import {
    onDocumentUpdated,
    FirestoreEvent,
    Change,
    QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { FieldValue } from "firebase-admin/firestore";

export const onMatchCompleted = onDocumentUpdated(
    {
        document: "tournaments/{tournamentId}/matches/{matchId}",
        region: "us-central1",
    },
    async (event: FirestoreEvent<Change<QueryDocumentSnapshot> | undefined>) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();

        // Only act when status just changed TO 'completed'
        if (!before || !after) return;
        if (before.status === "completed") return;    // already handled
        if (after.status !== "completed") return;    // not a completion event

        const { tournamentId, matchId } = event.params;
        const winnerId = after.winnerId as string | null;
        const isBracket = after.isBracket as boolean | undefined;
        const round = after.round as number | undefined;

        if (!winnerId) {
            logger.warn("Match completed without winnerId", { matchId, tournamentId });
            return;
        }

        const db = admin.firestore();

        // ── Pool match: update participant stats ────────────────
        if (!isBracket) {
            const loserId = (after.participantsArray as string[]).find(id => id !== winnerId);

            const writes: Promise<unknown>[] = [
                // Winner +3 points, +1 win, +setsWon/gamesWon
                db.collection(`tournaments/${tournamentId}/participants`).doc(winnerId).update({
                    played: FieldValue.increment(1),
                    won: FieldValue.increment(1),
                    points: FieldValue.increment(3),         // 3 pts for a win
                    setsWon: FieldValue.increment(countSets(after, "A", winnerId)),
                    gamesWon: FieldValue.increment(countGames(after, "A", winnerId)),
                    setsLost: FieldValue.increment(countSets(after, "B", winnerId)),
                    gamesLost: FieldValue.increment(countGames(after, "B", winnerId)),
                }),
            ];

            if (loserId) {
                writes.push(
                    db.collection(`tournaments/${tournamentId}/participants`).doc(loserId).update({
                        played: FieldValue.increment(1),
                        lost: FieldValue.increment(1),
                        points: FieldValue.increment(0),
                        setsWon: FieldValue.increment(countSets(after, "A", loserId)),
                        gamesWon: FieldValue.increment(countGames(after, "A", loserId)),
                        setsLost: FieldValue.increment(countSets(after, "B", loserId)),
                        gamesLost: FieldValue.increment(countGames(after, "B", loserId)),
                    })
                );
            }

            await Promise.all(writes);
            logger.info("Pool stats updated", { matchId, winnerId, loserId });
            return;
        }

        // ── Bracket match: advance winner to next round ──────────
        logger.info("Bracket match complete — advancing winner", {
            matchId, tournamentId, winnerId, round,
        });

        const matchesRef = db.collection(`tournaments/${tournamentId}/matches`);

        // Find the next round match that has this match as a prerequisite,
        // or find a 'ready' bracket match in the next round with a BYE slot
        const nextRound = (round || 1) + 1;
        const nextRoundSnap = await matchesRef
            .where("isBracket", "==", true)
            .where("round", "==", nextRound)
            .where("status", "in", ["pending", "ready"])
            .get();

        // Find a slot with a 'BYE' player
        const targetMatch = nextRoundSnap.docs.find(d => {
            const data = d.data();
            return data.playerA_Id === null || data.playerB_Id === null;
        });

        if (!targetMatch) {
            logger.info("No next round match found — may be final", { matchId, round });

            // Check if this was the final — if so, mark tournament completed
            const totalRounds = Math.ceil(Math.log2(16)); // e.g. 4 for a 16-player bracket
            if ((round || 1) >= totalRounds) {
                await db.collection("tournaments").doc(tournamentId).update({
                    status: "completed",
                    champion: winnerId,
                    endedAt: FieldValue.serverTimestamp(),
                });
                logger.info("Tournament completed!", { tournamentId, champion: winnerId });
            }
            return;
        }

        // Place winner into the empty slot
        const targetData = targetMatch.data();
        const isSlotA = targetData.playerA_Id === null;
        const winnerDoc = await db.collection("users").doc(winnerId).get();
        const winnerName = winnerDoc.data()?.displayName || "Unknown";

        await targetMatch.ref.update({
            [isSlotA ? "playerA_Id" : "playerB_Id"]: winnerId,
            [isSlotA ? "playerA_Name" : "playerB_Name"]: winnerName,
            participantsArray: FieldValue.arrayUnion(winnerId),
            // If both players now filled, move to 'ready'
            status: targetData[isSlotA ? "playerB_Id" : "playerA_Id"]
                ? "ready"
                : "pending",
            updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("Winner advanced to next round", {
            winnerId, nextRound, matchId: targetMatch.id,
        });
    }
);

// ── Helpers ────────────────────────────────────────────────────

/** Count sets won by a player from the verified score */
function countSets(
    matchData: FirebaseFirestore.DocumentData,
    side: "A" | "B",
    uid: string
): number {
    const isA = matchData.playerA_Id === uid;
    const score = matchData.verifiedScore as { sets: Array<{ playerA: number; playerB: number }> } | null;
    if (!score?.sets) return 0;
    return score.sets.filter(s =>
        isA ? s.playerA > s.playerB : s.playerB > s.playerA
    ).length;
}

function countGames(
    matchData: FirebaseFirestore.DocumentData,
    side: "A" | "B",
    uid: string
): number {
    const isA = matchData.playerA_Id === uid;
    const score = matchData.verifiedScore as { sets: Array<{ playerA: number; playerB: number }> } | null;
    if (!score?.sets) return 0;
    return score.sets.reduce((sum, s) => sum + (isA ? s.playerA : s.playerB), 0);
}
