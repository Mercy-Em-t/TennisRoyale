/**
 * submitMatchScore — Callable Cloud Function
 * ─────────────────────────────────────────────────────────────
 * THE "BRAIN" of the tournament system.
 *
 * SOW §4.1 — Double-Entry Verification:
 *   - Server-side Firestore transaction (atomic, race-condition safe)
 *   - If both submissions match  → status: 'completed'
 *   - If submissions differ      → status: 'disputed'
 *   - One side pending           → status: 'live', waits for opponent
 *
 * Security:
 *   - Requires authentication
 *   - Caller must be in participantsArray
 *   - Match must be in a submittable state (called | live)
 *   - Cannot re-submit after match is completed or disputed
 *
 * Called from the client via:
 *   import { getFunctions, httpsCallable } from 'firebase/functions';
 *   const fn = httpsCallable(getFunctions(), 'submitMatchScore');
 *   await fn({ tournamentId, matchId, submittedScore });
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ── Types ─────────────────────────────────────────────────────

interface SubmitScorePayload {
    tournamentId: string;
    matchId: string;
    submittedScore: ScoreSubmission;
}

interface ScoreSubmission {
    sets: SetScore[];
    summary?: string;   // e.g. "6-4, 7-5"
}

interface SetScore {
    playerA: number;
    playerB: number;
}

// ── Helper: compare two score submissions for equality ────────
const scoresMatch = (a: ScoreSubmission, b: ScoreSubmission): boolean => {
    if (a.sets.length !== b.sets.length) return false;
    return a.sets.every((set, i) =>
        set.playerA === b.sets[i].playerA &&
        set.playerB === b.sets[i].playerB
    );
};

// ── Helper: determine winner uid from a verified score ────────
const determineWinner = (
    score: ScoreSubmission,
    playerA: string,
    playerB: string
): string | null => {
    let setsA = 0, setsB = 0;
    for (const set of score.sets) {
        if (set.playerA > set.playerB) setsA++;
        else setsB++;
    }
    if (setsA === setsB) return null;   // draw (shouldn't happen)
    return setsA > setsB ? playerA : playerB;
};

// ── Cloud Function ────────────────────────────────────────────
export const submitMatchScore = functions.https.onCall<SubmitScorePayload>(
    {
        region: "us-central1",
        timeoutSeconds: 30,
    },
    async (request) => {
        // ── 1. Auth guard ─────────────────────────────────────────
        if (!request.auth) {
            throw new functions.https.HttpsError(
                "unauthenticated",
                "You must be signed in to submit a score."
            );
        }

        const callerId = request.auth.uid;
        const { tournamentId, matchId, submittedScore } = request.data;

        // ── 2. Input validation ───────────────────────────────────
        if (!tournamentId || !matchId || !submittedScore?.sets?.length) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "tournamentId, matchId, and submittedScore.sets are required."
            );
        }

        const db = admin.firestore();
        const matchRef = db
            .collection("tournaments").doc(tournamentId)
            .collection("matches").doc(matchId);

        // ── Helper: write immutable audit entry ──────────────────
        // Called OUTSIDE the transaction so an audit write failure
        // never rolls back the actual match update.
        const writeAudit = async (
            action: string,
            details: Record<string, unknown>
        ) => {
            try {
                await db
                    .collection("tournaments").doc(tournamentId)
                    .collection("auditLog")
                    .add({
                        matchId,
                        action,
                        submittedBy: callerId,
                        details,
                        timestamp: FieldValue.serverTimestamp(),
                    });
            } catch (e) {
                functions.logger.warn("Audit log write failed (non-critical)", { matchId, action, e });
            }
        };

        // ── 3. Atomic transaction ─────────────────────────────────
        return db.runTransaction(async (tx) => {
            const matchSnap = await tx.get(matchRef);

            if (!matchSnap.exists) {
                throw new functions.https.HttpsError("not-found", "Match not found.");
            }

            const match = matchSnap.data()!;

            // ── 4. Eligibility checks ─────────────────────────────
            const participants: string[] = match.participantsArray || [];
            if (!participants.includes(callerId)) {
                throw new functions.https.HttpsError(
                    "permission-denied",
                    "You are not a participant in this match."
                );
            }

            const terminalStates = ["completed", "disputed"];
            if (terminalStates.includes(match.status)) {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    `Match is already ${match.status}. Scores cannot be changed.`
                );
            }

            if (match.status === "pending") {
                throw new functions.https.HttpsError(
                    "failed-precondition",
                    "This match has not started yet."
                );
            }

            // ── 5. Record this player's submission ────────────────
            const submissions: Record<string, ScoreSubmission> = {
                ...(match.submissions || {}),
                [callerId]: submittedScore,
            };

            // Identify opponent
            const opponentId = participants.find((id) => id !== callerId);
            const opponentScore = opponentId ? submissions[opponentId] : undefined;

            // ── 6. Decision machine ───────────────────────────────
            if (!opponentScore) {
                // Opponent hasn't submitted yet — mark as live, store submission
                tx.update(matchRef, {
                    submissions,
                    status: "live",
                    updatedAt: FieldValue.serverTimestamp(),
                });

                functions.logger.info("Score submitted — awaiting opponent", {
                    matchId, callerId, tournamentId,
                });

                // ── Audit: first submission ──────────────────────
                await writeAudit("SCORE_SUBMISSION", {
                    score: submittedScore,
                    result: "awaiting_opponent",
                    allScores: submissions,
                });

                return { result: "awaiting_opponent" };
            }

            // Both submitted — compare
            const isMatch = scoresMatch(submittedScore, opponentScore);

            if (isMatch) {
                // ── COMPLETED ──────────────────────────────────────
                const winnerId = determineWinner(
                    submittedScore,
                    match.playerA_Id,
                    match.playerB_Id
                );

                tx.update(matchRef, {
                    submissions,
                    status: "completed",
                    verifiedScore: submittedScore,
                    winnerId,
                    resolvedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                functions.logger.info("Match completed", {
                    matchId, tournamentId, winnerId,
                });

                // ── Audit: match completed ───────────────────────
                await writeAudit("MATCH_COMPLETED", {
                    verifiedScore: submittedScore,
                    winnerId,
                    allScores: submissions,
                });

                return { result: "completed", verifiedScore: submittedScore, winnerId };

            } else {
                // ── DISPUTED ──────────────────────────────────────
                tx.update(matchRef, {
                    submissions,
                    status: "disputed",
                    disputeReason: "score_mismatch",
                    disputeOpenedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                functions.logger.warn("Match disputed — score mismatch", {
                    matchId, tournamentId,
                    submittedBy: callerId,
                    scoreA: submissions[match.playerA_Id],
                    scoreB: submissions[match.playerB_Id],
                });

                // ── Audit: dispute opened ────────────────────────
                await writeAudit("DISPUTE_OPENED", {
                    scoreByPlayerA: submissions[match.playerA_Id],
                    scoreByPlayerB: submissions[match.playerB_Id],
                    conflictingEntry: submittedScore,
                });

                return { result: "disputed" };
            }
        });
    }
);
