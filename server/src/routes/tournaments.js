const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router();

const VALID_STATUSES = ['draft', 'registration_open', 'registration_closed', 'pools_published', 'in_progress', 'closed', 'archived'];

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

// GET /api/tournaments
router.get('/', (req, res) => {
  const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
  res.json(tournaments);
});

// POST /api/tournaments
router.post('/', authenticate, (req, res) => {
  const { name, description, max_players } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO tournaments (name, description, host_id, max_players)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(name, description || null, req.hostUser.id, max_players || 64);
  const tournament = getTournament(result.lastInsertRowid);
  res.status(201).json(tournament);
});

// GET /api/tournaments/:id
router.get('/:id', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
  res.json(tournament);
});

// PATCH /api/tournaments/:id
router.patch('/:id', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { name, description, max_players } = req.body;
  const updatedName = name !== undefined ? name : tournament.name;
  const updatedDesc = description !== undefined ? description : tournament.description;
  const updatedMax = max_players !== undefined ? max_players : tournament.max_players;

  db.prepare(`
    UPDATE tournaments SET name = ?, description = ?, max_players = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(updatedName, updatedDesc, updatedMax, req.params.id);

  res.json(getTournament(req.params.id));
});

// DELETE /api/tournaments/:id
router.delete('/:id', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Helper: status transition
function transitionStatus(req, res, targetStatus, allowedFrom) {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (!allowedFrom.includes(tournament.status)) {
    return res.status(409).json({
      error: `Cannot transition to '${targetStatus}' from '${tournament.status}'`
    });
  }

  db.prepare(`UPDATE tournaments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(targetStatus, req.params.id);
  res.json(getTournament(req.params.id));
}

// POST /api/tournaments/:id/open-registration
router.post('/:id/open-registration', authenticate, (req, res) => {
  transitionStatus(req, res, 'registration_open', ['draft', 'registration_closed']);
});

// POST /api/tournaments/:id/close-registration
router.post('/:id/close-registration', authenticate, (req, res) => {
  transitionStatus(req, res, 'registration_closed', ['registration_open']);
});

// POST /api/tournaments/:id/publish-pools
router.post('/:id/publish-pools', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (!['registration_closed', 'pools_published'].includes(tournament.status)) {
    return res.status(409).json({ error: `Cannot publish pools from '${tournament.status}'` });
  }

  // Mark all pools as published
  db.prepare('UPDATE pools SET published = 1 WHERE tournament_id = ?').run(req.params.id);
  db.prepare(`UPDATE tournaments SET status = 'pools_published', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(req.params.id);

  res.json(getTournament(req.params.id));
});

// POST /api/tournaments/:id/start
router.post('/:id/start', authenticate, (req, res) => {
  transitionStatus(req, res, 'in_progress', ['pools_published', 'registration_closed']);
});

// POST /api/tournaments/:id/close
router.post('/:id/close', authenticate, (req, res) => {
  transitionStatus(req, res, 'closed', ['in_progress']);
});

// POST /api/tournaments/:id/archive
router.post('/:id/archive', authenticate, (req, res) => {
  transitionStatus(req, res, 'archived', ['closed']);
});

// POST /api/tournaments/:id/open-late-registration
router.post('/:id/open-late-registration', authenticate, (req, res) => {
  transitionStatus(req, res, 'registration_open', ['pools_published', 'in_progress']);
});

// GET /api/tournaments/:id/export
router.get('/:id/export', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const players = db.prepare('SELECT * FROM players WHERE tournament_id = ?').all(req.params.id);
  const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(req.params.id);
  const poolIds = pools.map(p => p.id);
  const poolPlayers = poolIds.length
    ? db.prepare(`SELECT pp.*, p.name, p.seed FROM pool_players pp
        JOIN players p ON p.id = pp.player_id
        WHERE pp.pool_id ${db.buildInClause(poolIds).clause}`)
        .all(...poolIds)
    : [];
  const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(req.params.id);
  const brackets = db.prepare('SELECT * FROM brackets WHERE tournament_id = ?').all(req.params.id);

  res.json({
    tournament,
    players,
    pools: pools.map(pool => ({
      ...pool,
      players: poolPlayers.filter(pp => pp.pool_id === pool.id)
    })),
    matches,
    brackets,
    exported_at: new Date().toISOString()
  });
});

module.exports = router;
