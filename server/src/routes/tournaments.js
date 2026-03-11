const express = require('express');
const { v4: uuidv4 } = require('uuid');

function createTournamentRoutes(db) {
  const router = express.Router();

  // List all tournaments
  router.get('/', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
    res.json(tournaments);
  });

  // Get single tournament with stats
  router.get('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const registrationCount = db.prepare(
      'SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const matchCount = db.prepare(
      'SELECT COUNT(*) as count FROM matches WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const completedMatches = db.prepare(
      "SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND status = 'completed'"
    ).get(req.params.id).count;

    const poolCount = db.prepare(
      'SELECT COUNT(*) as count FROM pools WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const staffCount = db.prepare(
      'SELECT COUNT(*) as count FROM tournament_staff WHERE tournament_id = ?'
    ).get(req.params.id).count;

    res.json({
      ...tournament,
      stats: {
        registrations: registrationCount,
        matches: matchCount,
        completedMatches,
        pools: poolCount,
        staff: staffCount
      }
    });
  });

  // Create tournament
  router.post('/', (req, res) => {
    const { name, date, location, max_participants, fee, poster_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    db.prepare(
      'INSERT INTO tournaments (id, name, date, location, max_participants, fee, poster_url) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, name, date || null, location || null, max_participants || 32, fee || 0, poster_url || null);

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    res.status(201).json(tournament);
  });

  // Update tournament
  router.put('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const { name, date, location, max_participants, fee, poster_url, status, late_registration_open } = req.body;

    db.prepare(`
      UPDATE tournaments SET
        name = COALESCE(?, name),
        date = COALESCE(?, date),
        location = COALESCE(?, location),
        max_participants = COALESCE(?, max_participants),
        fee = COALESCE(?, fee),
        poster_url = COALESCE(?, poster_url),
        status = COALESCE(?, status),
        late_registration_open = COALESCE(?, late_registration_open),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || null, date || null, location || null,
      max_participants || null, fee != null ? fee : null, poster_url || null,
      status || null, late_registration_open != null ? late_registration_open : null,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Delete tournament
  router.delete('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    db.prepare('DELETE FROM tournament_messages WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournament_staff WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM pool_players WHERE pool_id IN (SELECT id FROM pools WHERE tournament_id = ?)').run(req.params.id);
    db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM registrations WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);

    res.json({ message: 'Tournament deleted' });
  });

  return router;
}

module.exports = createTournamentRoutes;
