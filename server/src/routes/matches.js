const express = require('express');
const crypto = require('crypto');
const {
  MATCH_STATES,
  PLAYER_STATES,
  TOURNAMENT_STATES,
  canTransitionMatch,
} = require('../models/states');

function createMatchRoutes(db) {
  const router = express.Router();

  // Create a match within a tournament
  router.post('/', (req, res) => {
    const { tournament_id, team_a_id, team_b_id, round, context_reason } = req.body;

    if (!tournament_id || !team_a_id || !team_b_id) {
      return res.status(400).json({ error: 'tournament_id, team_a_id, and team_b_id are required' });
    }

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.state !== TOURNAMENT_STATES.IN_PROGRESS) {
      return res.status(400).json({ error: 'Tournament must be in_progress to create matches' });
    }

    const teamA = db.prepare('SELECT * FROM players WHERE id = ?').get(team_a_id);
    const teamB = db.prepare('SELECT * FROM players WHERE id = ?').get(team_b_id);
    if (!teamA) return res.status(404).json({ error: 'Team A not found' });
    if (!teamB) return res.status(404).json({ error: 'Team B not found' });

    const id = crypto.randomUUID();
    db.prepare(
      'INSERT INTO matches (id, tournament_id, team_a_id, team_b_id, status, round, context_reason) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, tournament_id, team_a_id, team_b_id, MATCH_STATES.SCHEDULED, round || 1, context_reason || 'bracket');

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
    res.status(201).json(match);
  });

  // Get all matches (optionally filtered by tournament)
  router.get('/', (req, res) => {
    const { tournament_id } = req.query;
    let matches;
    if (tournament_id) {
      matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(tournament_id);
    } else {
      matches = db.prepare('SELECT * FROM matches').all();
    }
    res.json(matches);
  });

  // Get a single match with its result
  router.get('/:id', (req, res) => {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const result = db.prepare('SELECT * FROM results WHERE match_id = ?').get(req.params.id);
    res.json({ ...match, result: result || null });
  });

  // Update match status (state transition)
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!canTransitionMatch(match.status, status)) {
      return res.status(400).json({
        error: `Invalid state transition from "${match.status}" to "${status}"`,
      });
    }

    // When match starts, set both players to active
    if (status === MATCH_STATES.IN_PROGRESS) {
      db.prepare('UPDATE players SET status = ? WHERE id IN (?, ?) AND status = ?').run(
        PLAYER_STATES.ACTIVE, match.team_a_id, match.team_b_id, PLAYER_STATES.REGISTERED
      );
    }

    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Record match result (winner/loser)
  router.post('/:id/result', (req, res) => {
    const { winner_id } = req.body;
    if (!winner_id) {
      return res.status(400).json({ error: 'winner_id is required' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (match.status !== MATCH_STATES.IN_PROGRESS) {
      return res.status(400).json({ error: 'Match must be in_progress to record a result' });
    }

    if (winner_id !== match.team_a_id && winner_id !== match.team_b_id) {
      return res.status(400).json({ error: 'Winner must be one of the match participants' });
    }

    const loser_id = winner_id === match.team_a_id ? match.team_b_id : match.team_a_id;

    // Record the result
    const resultId = crypto.randomUUID();
    db.prepare('INSERT INTO results (id, match_id, winner_id, loser_id) VALUES (?, ?, ?, ?)').run(
      resultId, req.params.id, winner_id, loser_id
    );

    // Update match status to completed
    db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(MATCH_STATES.COMPLETED, req.params.id);

    // Winner goes back to registered (ready for next match), loser is eliminated
    db.prepare('UPDATE players SET status = ? WHERE id = ?').run(PLAYER_STATES.REGISTERED, winner_id);
    db.prepare('UPDATE players SET status = ? WHERE id = ?').run(PLAYER_STATES.ELIMINATED, loser_id);

    const result = db.prepare('SELECT * FROM results WHERE id = ?').get(resultId);
    const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);

    res.status(201).json({ match: updatedMatch, result });
  });

  // Get all results for a tournament (progression tracking)
  router.get('/tournament/:tournament_id/results', (req, res) => {
    const results = db.prepare(`
      SELECT r.*, m.round, m.context_reason, m.team_a_id, m.team_b_id
      FROM results r
      JOIN matches m ON m.id = r.match_id
      WHERE m.tournament_id = ?
      ORDER BY m.round ASC, r.recorded_at ASC
    `).all(req.params.tournament_id);
    res.json(results);
  });

  return router;
}

module.exports = { createMatchRoutes };
