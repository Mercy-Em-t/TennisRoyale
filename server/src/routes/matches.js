const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');

function createMatchRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // List matches for a tournament (public)
  router.get('/', (req, res) => {
    const matches = db.prepare(`
      SELECT m.*,
        p1.name as player1_name, p2.name as player2_name,
        w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.bracket_stage, m.round, m.created_at
    `).all(req.params.tournamentId);
    res.json(matches);
  });

  // Create a match (host only)
  router.post('/', requireRole('host'), (req, res) => {
    const { player1_id, player2_id, pool_id, round, bracket_stage, scheduled_at } = req.body;
    if (!player1_id || !player2_id) {
      return res.status(400).json({ error: 'Both players are required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO matches (id, tournament_id, pool_id, round, bracket_stage, player1_id, player2_id, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.tournamentId, pool_id || null, round || 1, bracket_stage || 'pool', player1_id, player2_id, scheduled_at || null);

    const match = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      WHERE m.id = ?
    `).get(id);
    res.status(201).json(match);
  });

  // Update match score (host or referee)
  router.put('/:matchId', requireRole('host', 'referee'), (req, res) => {
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tournament_id = ?')
      .get(req.params.matchId, req.params.tournamentId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const { score_player1, score_player2, scheduled_at, status } = req.body;

    let winnerId = match.winner_id;
    let newStatus = status || match.status;

    if (score_player1 != null && score_player2 != null) {
      if (score_player1 > score_player2) winnerId = match.player1_id;
      else if (score_player2 > score_player1) winnerId = match.player2_id;
      newStatus = 'completed';
    }

    db.prepare(`
      UPDATE matches SET
        score_player1 = COALESCE(?, score_player1),
        score_player2 = COALESCE(?, score_player2),
        winner_id = ?,
        scheduled_at = COALESCE(?, scheduled_at),
        status = ?
      WHERE id = ?
    `).run(
      score_player1 != null ? score_player1 : null,
      score_player2 != null ? score_player2 : null,
      winnerId,
      scheduled_at || null,
      newStatus,
      req.params.matchId
    );

    const updated = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.id = ?
    `).get(req.params.matchId);
    res.json(updated);
  });

  // Delete a match (host only)
  router.delete('/:matchId', requireRole('host'), (req, res) => {
    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND tournament_id = ?')
      .get(req.params.matchId, req.params.tournamentId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.matchId);
    res.json({ message: 'Match deleted' });
  });

  return router;
}

module.exports = createMatchRoutes;
