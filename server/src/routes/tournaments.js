const express = require('express');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');

function createTournamentRouter(db) {
  const router = express.Router();

  // GET /api/tournaments - Browse tournaments (public, only published)
  router.get('/', (req, res) => {
    try {
      const { sport, location, date } = req.query;
      let query = 'SELECT t.*, u.name as host_name FROM tournaments t JOIN users u ON t.host_id = u.id WHERE t.status = ?';
      const params = ['published'];

      if (sport) {
        query += ' AND t.sport = ?';
        params.push(sport);
      }
      if (location) {
        query += ' AND t.location LIKE ?';
        params.push(`%${location}%`);
      }
      if (date) {
        query += ' AND t.start_date >= ?';
        params.push(date);
      }

      query += ' ORDER BY t.start_date ASC';

      const tournaments = db.prepare(query).all(...params);
      res.json({ tournaments });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  });

  // GET /api/tournaments/:id - Tournament details
  router.get('/:id', (req, res) => {
    try {
      const tournament = db.prepare(
        'SELECT t.*, u.name as host_name FROM tournaments t JOIN users u ON t.host_id = u.id WHERE t.id = ?'
      ).get(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ tournament });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  });

  // POST /api/tournaments - Create tournament (host only)
  router.post('/', authenticate, requireRole('host'), (req, res) => {
    try {
      const { title, description, sport, location, entry_fee, max_players, registration_deadline, start_date, end_date } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO tournaments (id, host_id, title, description, sport, location, entry_fee, max_players, registration_deadline, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, req.user.id, title, description || null, sport || 'tennis', location || null, entry_fee || 0, max_players || 32, registration_deadline || null, start_date || null, end_date || null);

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
      res.status(201).json({ tournament });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  // POST /api/tournaments/:id/publish - Publish tournament
  router.post('/:id/publish', authenticate, requireRole('host'), (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ? AND host_id = ?').get(req.params.id, req.user.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft tournaments can be published' });
      }

      db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('published', req.params.id);

      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      res.json({ tournament: updated, registration_link: `/tournaments/${req.params.id}/register` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to publish tournament' });
    }
  });

  // POST /api/tournaments/:id/register - Register for tournament
  router.post('/:id/register', authenticate, (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'published') {
        return res.status(400).json({ error: 'Tournament is not open for registration' });
      }

      // Check registration deadline
      if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }

      // Check slots
      if (tournament.current_players >= tournament.max_players) {
        return res.status(400).json({ error: 'Tournament is full' });
      }

      // Check duplicate
      const existing = db.prepare(
        'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND player_id = ?'
      ).get(req.params.id, req.user.id);

      if (existing) {
        return res.status(409).json({ error: 'Already registered for this tournament' });
      }

      const regId = crypto.randomUUID();

      const transaction = db.transaction(() => {
        db.prepare(
          'INSERT INTO tournament_registrations (id, tournament_id, player_id) VALUES (?, ?, ?)'
        ).run(regId, req.params.id, req.user.id);

        db.prepare(
          'UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?'
        ).run(req.params.id);
      });

      transaction();

      const registration = db.prepare('SELECT * FROM tournament_registrations WHERE id = ?').get(regId);
      res.status(201).json({ registration });
    } catch (err) {
      res.status(500).json({ error: 'Failed to register for tournament' });
    }
  });

  return router;
}

module.exports = createTournamentRouter;
