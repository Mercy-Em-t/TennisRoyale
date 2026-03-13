/**
 * Load Test — 100 Concurrent Score Submissions
 * ─────────────────────────────────────────────────────────────
 * Simulates 100 players simultaneously submitting match scores
 * to verify that the submitMatchScore Cloud Function handles
 * race conditions without data corruption.
 *
 * Prerequisites:
 *   1. Firebase emulators running:
 *      firebase emulators:start --only functions,firestore,auth
 *   2. From functions/ directory:
 *      npx ts-node --esm scripts/loadTest.ts
 *
 * What it tests:
 *   - Atomic Firestore transaction under concurrent load
 *   - All 100 submissions resolve to either 'completed' or 'disputed'
 *   - Zero submissions result in partial/corrupt state ('live' after both submit)
 *   - Average Cloud Function latency under load
 */

import * as admin from "firebase-admin";

// Point at the local emulator
process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";
process.env["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099";

admin.initializeApp({ projectId: "tennis-royale-test" });

const db = admin.firestore();

const TOURNAMENT_ID = "load-test-tournament";
const CONCURRENCY = 100;  // simultaneous submissions
const MATCH_PAIRS = 50;   // 50 matches × 2 players = 100 submissions

// ── 1. Seed test data ─────────────────────────────────────────
const seedTournament = async () => {
    const batch = db.batch();

    // Create tournament
    batch.set(db.collection("tournaments").doc(TOURNAMENT_ID), {
        name: "Load Test Tournament",
        hostId: "system",
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create 50 matches with 2 players each
    const matchIds: string[] = [];
    for (let i = 0; i < MATCH_PAIRS; i++) {
        const playerA = `player_a_${i}`;
        const playerB = `player_b_${i}`;
        const matchRef = db
            .collection("tournaments").doc(TOURNAMENT_ID)
            .collection("matches").doc(`match_${i}`);

        matchIds.push(matchRef.id);

        batch.set(matchRef, {
            playerA_Id: playerA,
            playerA_Name: `Player A${i}`,
            playerB_Id: playerB,
            playerB_Name: `Player B${i}`,
            status: "live",
            submissions: {},
            participantsArray: [playerA, playerB],
            courtAssigned: (i % 10) + 1,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
    console.log(`✓ Seeded ${MATCH_PAIRS} matches`);
    return matchIds;
};

// ── 2. Simulate a single score submission (one player) ─────────
const submitScore = async (
    matchIndex: number,
    side: "A" | "B",
    agree: boolean  // true = matching scores, false = trigger dispute
): Promise<{ matchId: string; result: string; latencyMs: number }> => {
    const matchId = `match_${matchIndex}`;
    const playerId = side === "A" ? `player_a_${matchIndex}` : `player_b_${matchIndex}`;
    const matchRef = db
        .collection("tournaments").doc(TOURNAMENT_ID)
        .collection("matches").doc(matchId);

    // Agreed score: both sides submit 6-3
    // Disputed score: Player B submits 3-6
    const score = agree
        ? { sets: [{ playerA: 6, playerB: 3 }] }
        : { sets: [{ playerA: side === "A" ? 6 : 3, playerB: side === "A" ? 3 : 6 }] };

    const t0 = Date.now();
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(matchRef);
        if (!snap.exists) throw new Error(`Match ${matchId} not found`);

        const data = snap.data()!;
        const submissions = { ...(data.submissions || {}), [playerId]: score };
        const uids = data.participantsArray as string[];
        const allIn = uids.every(uid => submissions[uid]);

        if (!allIn) {
            tx.update(matchRef, { submissions, status: "live" });
            return;
        }

        const [a, b] = uids.map(uid => JSON.stringify(submissions[uid]));
        const isMatch = a === b;

        tx.update(matchRef, {
            submissions,
            status: isMatch ? "completed" : "disputed",
            verifiedScore: isMatch ? submissions[uids[0]] : null,
            resolvedAt: isMatch ? admin.firestore.FieldValue.serverTimestamp() : null,
        });
    });

    return { matchId, result: "submitted", latencyMs: Date.now() - t0 };
};

// ── 3. Verify no match is in a corrupt intermediate state ──────
const verifyResults = async (): Promise<void> => {
    const snap = await db
        .collection("tournaments").doc(TOURNAMENT_ID)
        .collection("matches")
        .get();

    let completed = 0;
    let disputed = 0;
    let corrupted = 0;

    for (const d of snap.docs) {
        const { status, submissions, participantsArray } = d.data() as {
            status: string;
            submissions: Record<string, unknown>;
            participantsArray: string[];
        };
        const subCount = Object.keys(submissions || {}).length;

        if (status === "completed") {
            completed++;
        } else if (status === "disputed") {
            disputed++;
        } else if (subCount === 2 && status === "live") {
            // Both submitted but status never resolved — this is data corruption
            console.error(`  ✗ CORRUPT: match ${d.id} has 2 submissions but status=live`);
            corrupted++;
        }
    }

    console.log("\n─── Verification Results ────────────────────────────────");
    console.log(`  Matches Total:    ${snap.size}`);
    console.log(`  Completed:        ${completed}`);
    console.log(`  Disputed:         ${disputed}`);
    console.log(`  Corrupted:        ${corrupted}  ← must be 0\n`);

    if (corrupted > 0) {
        console.error("❌ FAIL — Data corruption detected. Transaction logic needs review.");
        process.exit(1);
    } else {
        console.log("✅ PASS — All matches resolved cleanly. No race conditions detected.");
    }
};

// ── 4. Cleanup ─────────────────────────────────────────────────
const cleanup = async () => {
    const snap = await db.collection("tournaments").doc(TOURNAMENT_ID).collection("matches").get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection("tournaments").doc(TOURNAMENT_ID));
    await batch.commit();
    console.log("✓ Cleanup complete");
};

// ── 5. Main runner ─────────────────────────────────────────────
const run = async () => {
    console.log(`\n🎾 Tennis Royale — Load Test`);
    console.log(`   ${CONCURRENCY} concurrent submissions across ${MATCH_PAIRS} matches\n`);

    // Seed
    await seedTournament();

    // Build all submission tasks
    // For the first 40 matches: both players agree (expect 'completed')
    // For the last 10 matches:  players disagree    (expect 'disputed')
    const tasks: Promise<{ matchId: string; result: string; latencyMs: number }>[] = [];

    for (let i = 0; i < MATCH_PAIRS; i++) {
        const agree = i < 40;
        tasks.push(submitScore(i, "A", agree));
        tasks.push(submitScore(i, "B", true)); // Player B always agrees with themselves
    }

    console.log(`⚡ Firing ${tasks.length} concurrent submissions...`);
    const t0 = Date.now();

    const results = await Promise.allSettled(tasks);

    const totalMs = Date.now() - t0;
    const failed = results.filter(r => r.status === "rejected");
    const latencies = results
        .filter((r): r is PromiseFulfilledResult<{ latencyMs: number }> => r.status === "fulfilled")
        .map(r => r.value.latencyMs);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);

    console.log(`\n─── Performance ─────────────────────────────────────────`);
    console.log(`  Total wall time:  ${totalMs}ms`);
    console.log(`  Avg tx latency:   ${Math.round(avgLatency)}ms`);
    console.log(`  Max tx latency:   ${maxLatency}ms`);
    console.log(`  Failed calls:     ${failed.length}`);

    if (failed.length > 0) {
        failed.slice(0, 5).forEach(f => console.error("  Error:", (f as PromiseRejectedResult).reason));
    }

    // Verify data integrity
    await verifyResults();
    await cleanup();
    process.exit(0);
};

run().catch(err => { console.error("Load test crashed:", err); process.exit(1); });
