const { Router } = require('express');
const crypto = require('crypto');

function createTournamentRoutes(db) {
  const router = Router();

  // Create tournament
  router.post('/', (req, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO tournaments (id, name) VALUES (?, ?)').run(id, name);
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    res.status(201).json(tournament);
  });

  // List tournaments
  router.get('/', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments WHERE archived = 0 ORDER BY created_at DESC').all();
    res.json(tournaments);
  });

  // Get tournament by ID
  router.get('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  });

  // Open registration
  router.patch('/:id/open-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'draft') {
      return res.status(400).json({ error: 'Can only open registration from draft status' });
    }
    db.prepare("UPDATE tournaments SET status = 'registration_open', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close registration
  router.patch('/:id/close-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'registration_open') {
      return res.status(400).json({ error: 'Registration is not currently open' });
    }
    db.prepare("UPDATE tournaments SET status = 'registration_closed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Open late registration
  router.patch('/:id/open-late-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Late registration can only be opened when tournament is in progress' });
    }
    db.prepare("UPDATE tournaments SET late_registration_open = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close late registration
  router.patch('/:id/close-late-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    db.prepare("UPDATE tournaments SET late_registration_open = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close tournament
  router.patch('/:id/close', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Can only close a tournament that is in progress' });
    }
    // Check all matches are completed
    const pendingMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND status != 'completed'").get(req.params.id);
    if (pendingMatches.count > 0) {
      return res.status(400).json({ error: `Cannot close tournament: ${pendingMatches.count} matches are still pending` });
    }
    db.prepare("UPDATE tournaments SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Export tournament data
  router.get('/:id/export', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registrations = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r
      JOIN players p ON r.player_id = p.id
      WHERE r.tournament_id = ?
    `).all(req.params.id);

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(req.params.id);
    const poolsWithPlayers = pools.map(pool => {
      const players = db.prepare(`
        SELECT pp.*, p.name as player_name, p.email as player_email
        FROM pool_players pp
        JOIN players p ON pp.player_id = p.id
        WHERE pp.pool_id = ?
        ORDER BY pp.seed_position
      `).all(pool.id);
      return { ...pool, players };
    });

    const matches = db.prepare(`
      SELECT m.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round, m.bracket_stage
    `).all(req.params.id);

    res.json({
      tournament,
      registrations,
      pools: poolsWithPlayers,
      matches
    });
  });

  // Archive tournament
  router.post('/:id/archive', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'completed') {
      return res.status(400).json({ error: 'Can only archive a completed tournament' });
    }
    db.prepare("UPDATE tournaments SET archived = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  return router;
}

module.exports = createTournamentRoutes;
