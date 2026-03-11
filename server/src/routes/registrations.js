const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router({ mergeParams: true });

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

function getPlayer(tournamentId, playerId) {
  return db.prepare('SELECT * FROM players WHERE id = ? AND tournament_id = ?').get(playerId, tournamentId);
}

// GET /api/tournaments/:id/registrations
router.get('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const players = db.prepare('SELECT * FROM players WHERE tournament_id = ? ORDER BY registered_at ASC')
    .all(req.params.id);
  res.json(players);
});

// POST /api/tournaments/:id/registrations
router.post('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (!['registration_open'].includes(tournament.status)) {
    return res.status(409).json({ error: 'Tournament is not accepting registrations' });
  }

  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  // Count accepted players and enforce max
  const accepted = db.prepare(
    `SELECT COUNT(*) as count FROM players WHERE tournament_id = ? AND status IN ('accepted', 'late')`
  ).get(req.params.id);

  const isLate = accepted.count >= tournament.max_players;
  const status = isLate ? 'late' : 'pending';

  const result = db.prepare(`
    INSERT INTO players (tournament_id, name, email, phone, status) VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, name, email || null, phone || null, status);

  res.status(201).json(db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/tournaments/:id/registrations/:playerId/accept
router.patch('/:playerId/accept', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Preserve 'late' status for late registrants so they can be identified later
  const newStatus = player.status === 'late' ? 'late' : 'accepted';
  db.prepare(`UPDATE players SET status = ? WHERE id = ?`).run(newStatus, player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// PATCH /api/tournaments/:id/registrations/:playerId/reject
router.patch('/:playerId/reject', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare(`UPDATE players SET status = 'rejected' WHERE id = ?`).run(player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// PATCH /api/tournaments/:id/registrations/:playerId/seed
router.patch('/:playerId/seed', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const { seed } = req.body;
  if (seed !== null && seed !== undefined && (typeof seed !== 'number' || seed < 1)) {
    return res.status(400).json({ error: 'seed must be a positive integer or null' });
  }

  db.prepare('UPDATE players SET seed = ? WHERE id = ?').run(seed ?? null, player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// DELETE /api/tournaments/:id/registrations/:playerId
router.delete('/:playerId', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare('DELETE FROM players WHERE id = ?').run(player.id);
  res.status(204).send();
});

module.exports = router;
