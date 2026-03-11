const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router({ mergeParams: true });

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

// GET /api/tournaments/:id/bracket
router.get('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const entries = db.prepare(`
    SELECT b.id, b.tournament_id, b.round, b.match_id, b.next_match_id,
           m.player1_id, m.player2_id, m.winner_id, m.status as match_status,
           m.score_player1, m.score_player2, m.scheduled_at, m.match_number, m.bracket_position,
           p1.name as player1_name, p2.name as player2_name
    FROM brackets b
    JOIN matches m ON m.id = b.match_id
    LEFT JOIN players p1 ON p1.id = m.player1_id
    LEFT JOIN players p2 ON p2.id = m.player2_id
    WHERE b.tournament_id = ?
    ORDER BY b.round ASC, b.id ASC
  `).all(req.params.id);

  // Shape into nested structure expected by client
  const rounds = {};
  for (const entry of entries) {
    if (!rounds[entry.round]) rounds[entry.round] = [];
    rounds[entry.round].push({
      id: entry.id,
      round: entry.round,
      match_id: entry.match_id,
      next_match_id: entry.next_match_id,
      match: {
        id: entry.match_id,
        player1_id: entry.player1_id,
        player2_id: entry.player2_id,
        player1_name: entry.player1_name,
        player2_name: entry.player2_name,
        winner_id: entry.winner_id,
        status: entry.match_status,
        score_player1: entry.score_player1,
        score_player2: entry.score_player2,
        scheduled_at: entry.scheduled_at,
        match_number: entry.match_number,
        bracket_position: entry.bracket_position,
      },
    });
  }

  res.json({ tournament_id: parseInt(req.params.id), rounds });
});

// POST /api/tournaments/:id/bracket/generate
router.post('/generate', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  // Collect pool winners: player with most wins in each pool (or by seed)
  const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(req.params.id);
  if (pools.length === 0) {
    return res.status(400).json({ error: 'No pools found for this tournament' });
  }

  // Get top players from each pool based on wins
  const advancingPlayers = [];
  for (const pool of pools) {
    const standings = db.prepare(`
      SELECT
        p.id, p.name, p.seed,
        SUM(CASE WHEN m.winner_id = p.id THEN 1 ELSE 0 END) as wins,
        COUNT(CASE WHEN m.status = 'completed' AND (m.player1_id = p.id OR m.player2_id = p.id) THEN 1 END) as played
      FROM pool_players pp
      JOIN players p ON p.id = pp.player_id
      LEFT JOIN matches m ON m.pool_id = pp.pool_id AND (m.player1_id = p.id OR m.player2_id = p.id)
      WHERE pp.pool_id = ?
      GROUP BY p.id
      ORDER BY wins DESC, CASE WHEN p.seed IS NULL THEN 999999 ELSE p.seed END ASC
    `).all(pool.id);

    // Advance top players_per_pool players (default 2 per pool, configurable)
    const advanceCount = req.body.players_per_pool || 2;
    const toAdvance = standings.slice(0, advanceCount);
    for (const player of toAdvance) {
      advancingPlayers.push({ ...player, pool_name: pool.name });
    }
  }

  if (advancingPlayers.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players to generate bracket' });
  }

  // Delete existing bracket matches and entries for this tournament
  const existingBracketEntries = db.prepare('SELECT * FROM brackets WHERE tournament_id = ?').all(req.params.id);
  if (existingBracketEntries.length) {
    const matchIds = existingBracketEntries.map(b => b.match_id);
    const { clause, values } = db.buildInClause(matchIds);
    db.prepare(`DELETE FROM matches WHERE id ${clause}`).run(...values);
  }
  db.prepare('DELETE FROM brackets WHERE tournament_id = ?').run(req.params.id);

  // Build single-elimination bracket
  // Pad to next power of 2
  const numPlayers = advancingPlayers.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  const numRounds = Math.ceil(Math.log2(bracketSize));

  // Seed players into bracket positions (1 vs last, 2 vs second-last, etc.)
  // Sort by seed, then wins
  const seeded = [...advancingPlayers].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return b.wins - a.wins;
  });

  // Create bracket slots using standard seeding
  const slots = new Array(bracketSize).fill(null);
  const seedPositions = generateSeedPositions(bracketSize);
  seeded.forEach((player, i) => {
    if (i < seedPositions.length) slots[seedPositions[i]] = player;
  });

  // Create round 1 matches
  const matchesByRound = {};
  const insertMatch = db.prepare(`
    INSERT INTO matches (tournament_id, player1_id, player2_id, round, match_number, status, bracket_position)
    VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
  `);
  const insertBracket = db.prepare(`
    INSERT INTO brackets (tournament_id, round, match_id, next_match_id) VALUES (?, ?, ?, NULL)
  `);

  const generate = db.transaction(() => {
    let matchNumber = 1;

    // Create all matches across all rounds (TBD for later rounds)
    for (let round = 1; round <= numRounds; round++) {
      matchesByRound[round] = [];
      const matchesInRound = bracketSize / Math.pow(2, round);
      for (let pos = 0; pos < matchesInRound; pos++) {
        let p1Id = null;
        let p2Id = null;

        if (round === 1) {
          const p1 = slots[pos * 2];
          const p2 = slots[pos * 2 + 1];
          p1Id = p1 ? p1.id : null;
          p2Id = p2 ? p2.id : null;
        }

        // Only create match if at least one player is known (or it's a later round placeholder)
        if (round === 1 && !p1Id && !p2Id) continue;

        const matchResult = insertMatch.run(
          req.params.id,
          p1Id || null,
          p2Id || null,
          round,
          matchNumber++,
          pos
        );
        const bracketResult = insertBracket.run(req.params.id, round, matchResult.lastInsertRowid);

        matchesByRound[round].push({
          id: matchResult.lastInsertRowid,
          bracket_id: bracketResult.lastInsertRowid,
          position: pos
        });

        // Handle byes: if only one player, auto-advance
        if (round === 1 && p1Id && !p2Id) {
          db.prepare(`UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?`)
            .run(p1Id, matchResult.lastInsertRowid);
        } else if (round === 1 && !p1Id && p2Id) {
          db.prepare(`UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?`)
            .run(p2Id, matchResult.lastInsertRowid);
        }
      }

      // Create placeholder matches for rounds 2+ if not already done
      if (round > 1 && matchesByRound[round].length === 0) {
        const matchesThisRound = bracketSize / Math.pow(2, round);
        for (let pos = 0; pos < matchesThisRound; pos++) {
          const matchResult = insertMatch.run(req.params.id, null, null, round, matchNumber++, pos);
          const bracketResult = insertBracket.run(req.params.id, round, matchResult.lastInsertRowid);
          matchesByRound[round].push({
            id: matchResult.lastInsertRowid,
            bracket_id: bracketResult.lastInsertRowid,
            position: pos
          });
        }
      }
    }

    // Link matches: each match feeds into next round
    for (let round = 1; round < numRounds; round++) {
      const currentRound = matchesByRound[round] || [];
      const nextRound = matchesByRound[round + 1] || [];
      currentRound.forEach((match, idx) => {
        const nextMatchIndex = Math.floor(idx / 2);
        const nextMatch = nextRound[nextMatchIndex];
        if (nextMatch) {
          db.prepare('UPDATE brackets SET next_match_id = ? WHERE id = ?')
            .run(nextMatch.id, match.bracket_id);
        }
      });
    }

    // Advance byes immediately
    for (const match of matchesByRound[1] || []) {
      const m = db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id);
      if (m && m.winner_id) {
        const bracket = db.prepare('SELECT * FROM brackets WHERE match_id = ?').get(m.id);
        if (bracket && bracket.next_match_id) {
          const nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(bracket.next_match_id);
          if (nextMatch) {
            if (!nextMatch.player1_id) {
              db.prepare('UPDATE matches SET player1_id = ? WHERE id = ?').run(m.winner_id, nextMatch.id);
            } else {
              db.prepare('UPDATE matches SET player2_id = ? WHERE id = ?').run(m.winner_id, nextMatch.id);
            }
          }
        }
      }
    }
  });
  generate();

  // Return bracket
  const entries = db.prepare(`
    SELECT b.id, b.tournament_id, b.round, b.match_id, b.next_match_id,
           m.player1_id, m.player2_id, m.winner_id, m.status as match_status,
           m.score_player1, m.score_player2, m.scheduled_at, m.match_number, m.bracket_position,
           p1.name as player1_name, p2.name as player2_name
    FROM brackets b
    JOIN matches m ON m.id = b.match_id
    LEFT JOIN players p1 ON p1.id = m.player1_id
    LEFT JOIN players p2 ON p2.id = m.player2_id
    WHERE b.tournament_id = ?
    ORDER BY b.round ASC, m.bracket_position ASC
  `).all(req.params.id);

  const rounds = {};
  for (const entry of entries) {
    if (!rounds[entry.round]) rounds[entry.round] = [];
    rounds[entry.round].push({
      id: entry.id,
      round: entry.round,
      match_id: entry.match_id,
      next_match_id: entry.next_match_id,
      match: {
        id: entry.match_id,
        player1_id: entry.player1_id,
        player2_id: entry.player2_id,
        player1_name: entry.player1_name,
        player2_name: entry.player2_name,
        winner_id: entry.winner_id,
        status: entry.match_status,
        score_player1: entry.score_player1,
        score_player2: entry.score_player2,
        scheduled_at: entry.scheduled_at,
        match_number: entry.match_number,
        bracket_position: entry.bracket_position,
      },
    });
  }

  res.status(201).json({ tournament_id: parseInt(req.params.id), rounds });
});

// PATCH /api/tournaments/:id/bracket/advance
router.patch('/advance', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { match_id, winner_id } = req.body;
  if (!match_id || !winner_id) {
    return res.status(400).json({ error: 'match_id and winner_id are required' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tournament_id = ?')
    .get(match_id, req.params.id);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
    return res.status(400).json({ error: 'winner_id must be one of the match players' });
  }

  const bracket = db.prepare('SELECT * FROM brackets WHERE match_id = ?').get(match_id);
  if (!bracket) return res.status(404).json({ error: 'Bracket entry not found for this match' });

  db.prepare(`UPDATE matches SET winner_id = ?, status = 'completed' WHERE id = ?`)
    .run(winner_id, match_id);

  let nextMatch = null;
  if (bracket.next_match_id) {
    nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(bracket.next_match_id);
    if (nextMatch) {
      if (!nextMatch.player1_id) {
        db.prepare('UPDATE matches SET player1_id = ? WHERE id = ?').run(winner_id, bracket.next_match_id);
      } else {
        db.prepare('UPDATE matches SET player2_id = ? WHERE id = ?').run(winner_id, bracket.next_match_id);
      }
      nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(bracket.next_match_id);
    }
  }

  res.json({
    match: db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id),
    next_match: nextMatch,
    bracket
  });
});

/**
 * Generate standard seeding positions for a bracket of given size.
 * Returns array of slot positions in order of seeding (seed 1, seed 2, etc.)
 */
function generateSeedPositions(size) {
  if (size === 1) return [0];
  const half = size / 2;
  const left = generateSeedPositions(half);
  const right = generateSeedPositions(half).map(i => i + half);

  const result = [];
  for (let i = 0; i < left.length; i++) {
    result.push(left[i]);
    result.push(right[left.length - 1 - i]);
  }
  return result;
}

module.exports = router;
