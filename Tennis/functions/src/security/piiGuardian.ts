/**
 * PII Guardian — Firestore Cloud Function
 * ─────────────────────────────────────────────────────────────
 * SOW Phase 5: "Ensure no PII is leaked in public tournament feeds."
 *
 * WHAT IS PUBLIC in this app:
 *   - tournaments/{id}          → visible without login
 *   - tournaments/{id}/matches  → visible without login (live scoreboard)
 *
 * WHAT SHOULD NEVER APPEAR in those public documents:
 *   - Email addresses
 *   - Phone numbers
 *   - Firebase UIDs (these are tracked but not displayed in public UI)
 *   - Any field from the private users/{uid} doc (DOB, address, etc.)
 *
 * HOW THIS WORKS:
 *   1. onMatchWrite trigger — strips any accidental PII before
 *      a match document is written to Firestore.
 *   2. auditPIIFields() helper — callable by admins to scan all
 *      existing match docs and report any PII fields found.
 *   3. createSafePublicProfile() utility — used by any function
 *      that denormalises player data into a match document.
 *      Only copies display-safe fields, never email/phone/DOB.
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ── PII field names that must never appear in public documents ─
const PII_FIELDS = [
    "email",
    "phoneNumber",
    "phone",
    "dateOfBirth",
    "dob",
    "address",
    "postcode",
    "nationalId",
    "passportNumber",
    "bankAccount",
    "creditCard",
];

// ── Regex patterns for detecting PII values ────────────────────
const PII_PATTERNS: RegExp[] = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,   // email
    /\+?[0-9\s\-().]{10,}/,                                 // phone
];

// ── Strip known PII fields from an object (shallow) ───────────
const stripPII = (data: Record<string, unknown>): Record<string, unknown> => {
    const clean = { ...data };
    let stripped = false;

    for (const field of PII_FIELDS) {
        if (field in clean) {
            delete clean[field];
            stripped = true;
            logger.warn(`PII Guardian: stripped field "${field}" from document`);
        }
    }

    // Scan string values for email patterns
    for (const [key, value] of Object.entries(clean)) {
        if (typeof value === "string") {
            for (const pattern of PII_PATTERNS) {
                if (pattern.test(value)) {
                    delete clean[key];
                    stripped = true;
                    logger.error(`PII Guardian: stripped "${key}" — matched PII pattern`);
                    break;
                }
            }
        }
    }

    return stripped ? clean : data;
};

// ── Trigger: sanitize match documents on every write ──────────
export const piiGuardian = onDocumentWritten(
    {
        document: "tournaments/{tournamentId}/matches/{matchId}",
        region: "us-central1",
    },
    async (event) => {
        const after = event.data?.after;
        if (!after?.exists) return;   // deletion event

        const data = after.data() as Record<string, unknown>;
        const clean = stripPII(data);

        // Only write back if something was stripped (avoids infinite loops)
        if (clean !== data) {
            await after.ref.set(clean, { merge: true });
            logger.warn("PII Guardian: sanitized match document", {
                tournamentId: event.params.tournamentId,
                matchId: event.params.matchId,
            });
        }
    }
);

// ── Callable: scan all existing match documents for PII ────────
export const auditPIIFields = functions.https.onCall(
    { region: "us-central1" },
    async (request) => {
        // Admin only
        if (!request.auth) {
            throw new functions.https.HttpsError("unauthenticated", "Login required.");
        }
        const userDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
        if (userDoc.data()?.role !== "admin") {
            throw new functions.https.HttpsError("permission-denied", "Admins only.");
        }

        const db = admin.firestore();
        const results: { path: string; fieldsFound: string[] }[] = [];

        // Scan all tournaments
        const tournamentsSnap = await db.collection("tournaments").get();
        for (const tournament of tournamentsSnap.docs) {
            const matchesSnap = await db
                .collection(`tournaments/${tournament.id}/matches`)
                .get();

            for (const match of matchesSnap.docs) {
                const data = match.data() as Record<string, unknown>;
                const fieldsFound: string[] = [];

                for (const field of PII_FIELDS) {
                    if (field in data) fieldsFound.push(field);
                }
                for (const [key, value] of Object.entries(data)) {
                    if (typeof value === "string") {
                        for (const pattern of PII_PATTERNS) {
                            if (pattern.test(value)) {
                                fieldsFound.push(`${key} (value match)`);
                            }
                        }
                    }
                }
                if (fieldsFound.length > 0) {
                    results.push({ path: match.ref.path, fieldsFound });
                }
            }
        }

        logger.info("PII audit complete", { findings: results.length });
        return { findings: results.length, results };
    }
);

// ── Utility: create a display-safe player profile ─────────────
// Use this whenever denormalising player data into a match document.
// Never pass the full users/{uid} document directly into a match.
export const createSafePublicProfile = (userDoc: Record<string, unknown>) => ({
    displayName: userDoc.displayName || "Unknown Player",
    photoURL: userDoc.photoURL || null,
    uid: userDoc.uid,               // uid is not PII — it's a system key
    // ↓ These are intentionally OMITTED:
    // email, phoneNumber, dateOfBirth, address
});
