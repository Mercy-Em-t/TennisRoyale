const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router({ mergeParams: true });

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

function getMatch(tournamentId, matchId) {
  return db.prepare('SELECT * FROM matches WHERE id = ? AND tournament_id = ?').get(matchId, tournamentId);
}

// GET /api/tournaments/:id/matches
router.get('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { pool_id, status, round } = req.query;
  let query = 'SELECT m.*, p1.name as player1_name, p2.name as player2_name FROM matches m LEFT JOIN players p1 ON p1.id = m.player1_id LEFT JOIN players p2 ON p2.id = m.player2_id WHERE m.tournament_id = ?';
  const params = [req.params.id];

  if (pool_id) { query += ' AND m.pool_id = ?'; params.push(pool_id); }
  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (round) { query += ' AND m.round = ?'; params.push(round); }

  query += ' ORDER BY m.round ASC, m.match_number ASC';

  res.json(db.prepare(query).all(...params));
});

// GET /api/tournaments/:id/matches/:matchId
router.get('/:matchId', (req, res) => {
  const match = getMatch(req.params.id, req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  res.json(match);
});

// PATCH /api/tournaments/:id/matches/:matchId/schedule
router.patch('/:matchId/schedule', authenticate, (req, res) => {
  const match = getMatch(req.params.id, req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { scheduled_at } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });

  db.prepare('UPDATE matches SET scheduled_at = ? WHERE id = ?').run(scheduled_at, match.id);
  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id));
});

// PATCH /api/tournaments/:id/matches/:matchId/score
router.patch('/:matchId/score', authenticate, (req, res) => {
  const match = getMatch(req.params.id, req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { score_player1, score_player2, winner_id } = req.body;
  if (score_player1 === undefined || score_player2 === undefined) {
    return res.status(400).json({ error: 'score_player1 and score_player2 are required' });
  }

  if (winner_id && winner_id !== match.player1_id && winner_id !== match.player2_id) {
    return res.status(400).json({ error: 'winner_id must be player1_id or player2_id' });
  }

  db.prepare(`
    UPDATE matches SET score_player1 = ?, score_player2 = ?, winner_id = ?, status = 'completed' WHERE id = ?
  `).run(score_player1, score_player2, winner_id || null, match.id);

  // If this is a bracket match, auto-advance winner
  if (winner_id) {
    const bracket = db.prepare('SELECT * FROM brackets WHERE match_id = ?').get(match.id);
    if (bracket && bracket.next_match_id) {
      const nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(bracket.next_match_id);
      if (nextMatch) {
        if (!nextMatch.player1_id) {
          db.prepare('UPDATE matches SET player1_id = ? WHERE id = ?').run(winner_id, nextMatch.id);
        } else {
          db.prepare('UPDATE matches SET player2_id = ? WHERE id = ?').run(winner_id, nextMatch.id);
        }
      }
    }
  }

  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id));
});

// PATCH /api/tournaments/:id/matches/:matchId/status
router.patch('/:matchId/status', authenticate, (req, res) => {
  const match = getMatch(req.params.id, req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const { status } = req.body;
  const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(status, match.id);
  res.json(db.prepare('SELECT * FROM matches WHERE id = ?').get(match.id));
});

// POST /api/tournaments/:id/pools/:poolId/generate-late-matches
router.post('/pools/:poolId/generate-late-matches', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const pool = db.prepare('SELECT * FROM pools WHERE id = ? AND tournament_id = ?')
    .get(req.params.poolId, req.params.id);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  // Get late players in pool (status = 'late')
  const latePlayers = db.prepare(`
    SELECT p.* FROM pool_players pp
    JOIN players p ON p.id = pp.player_id
    WHERE pp.pool_id = ? AND p.status = 'late'
    ORDER BY pp.position ASC
  `).all(pool.id);

  if (latePlayers.length === 0) {
    return res.status(400).json({ error: 'No late registration players in this pool' });
  }

  // Get existing (non-late) players in pool
  const existingPlayers = db.prepare(`
    SELECT p.* FROM pool_players pp
    JOIN players p ON p.id = pp.player_id
    WHERE pp.pool_id = ? AND p.status != 'late'
    ORDER BY pp.position ASC
  `).all(pool.id);

  const insertMatch = db.prepare(`
    INSERT INTO matches (tournament_id, pool_id, player1_id, player2_id, round, match_number, status, is_late_registration)
    VALUES (?, ?, ?, ?, 1, ?, 'scheduled', 1)
  `);

  const matches = [];

  const generate = db.transaction(() => {
    let matchNumber = (db.prepare('SELECT MAX(match_number) as mx FROM matches WHERE pool_id = ?').get(pool.id).mx || 0) + 1;

    // Late vs late
    for (let i = 0; i < latePlayers.length; i++) {
      for (let j = i + 1; j < latePlayers.length; j++) {
        const result = insertMatch.run(req.params.id, pool.id, latePlayers[i].id, latePlayers[j].id, matchNumber++);
        matches.push(db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid));
      }
    }

    // Late vs existing
    for (const latePlayer of latePlayers) {
      for (const existing of existingPlayers) {
        const result = insertMatch.run(req.params.id, pool.id, latePlayer.id, existing.id, matchNumber++);
        matches.push(db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid));
      }
    }
  });
  generate();

  res.status(201).json(matches);
});

module.exports = router;
