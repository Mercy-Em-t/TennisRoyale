/**
 * Tennis Royale — Cloud Functions Entry Point
 * ─────────────────────────────────────────────────────────────
 * Re-exports all functions so the Firebase CLI picks them up
 * from a single file. Each domain is in its own module.
 */

import * as admin from "firebase-admin";

// Initialise once — shared by all functions
admin.initializeApp();

// ── Match functions ──────────────────────────────────────────
export { submitMatchScore } from "./matches/submitMatchScore";
export { onMatchCompleted } from "./matches/onMatchCompleted";

// ── Tournament functions ─────────────────────────────────────
export { triggerKillSwitch } from "./tournament/triggerKillSwitch";
export { onTournamentRegistration } from "./tournament/onTournamentRegistration";

// ── User functions ───────────────────────────────────────────
export { onUserCreated } from "./users/onUserCreated";

// ── Security functions ───────────────────────────────────────
export { piiGuardian, auditPIIFields } from "./security/piiGuardian";
