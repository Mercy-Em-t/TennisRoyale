const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Tournament Routes Factory
 */
function createTournamentRoutes(db) {
  const router = express.Router();

  // GET /api/tournaments - List all tournaments
  router.get('/', (req, res) => {
    try {
      const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
      res.json(tournaments);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournaments', message: err.message });
    }
  });

  // POST /api/tournaments - Create a tournament (host only)
  router.post('/', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const { name, description, location, start_date, end_date, max_players, entry_fee } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Tournament name is required' });
      }

      const id = uuidv4();
      const host_id = req.user.id;

      db.prepare(`
        INSERT INTO tournaments (id, host_id, name, description, location, start_date, end_date, max_players, entry_fee, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      `).run(id, host_id, name, description || null, location || null, start_date || null, end_date || null, max_players || 32, entry_fee || 0);

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
      createAuditLog(db, 'tournaments', id, 'create', null, tournament);

      res.status(201).json(tournament);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create tournament', message: err.message });
    }
  });

  // GET /api/tournaments/:id - Get details
  router.get('/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournament', message: err.message });
    }
  });

  // PUT /api/tournaments/:id - Update tournament
  router.put('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const oldTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!oldTournament) return res.status(404).json({ error: 'Tournament not found' });

      // Check ownership
      if (req.user.role !== 'admin' && oldTournament.host_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You do not own this tournament' });
      }

      const { name, description, location, start_date, end_date, max_players, entry_fee, status } = req.body;

      db.prepare(`
        UPDATE tournaments SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          max_players = COALESCE(?, max_players),
          entry_fee = COALESCE(?, entry_fee),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, description, location, start_date, end_date, max_players, entry_fee, status, req.params.id);

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'tournaments', req.params.id, 'update', oldTournament, tournament);

      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update tournament', message: err.message });
    }
  });

  // DELETE /api/tournaments/:id
  router.delete('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

      if (req.user.role !== 'admin' && tournament.host_id !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
      createAuditLog(db, 'tournaments', req.params.id, 'delete', tournament, null);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete tournament', message: err.message });
    }
  });

  // Tournament State Transitions
  const states = ['registration_open', 'registration_closed', 'in_progress', 'completed', 'archived'];
  states.forEach(state => {
    router.post(`/:id/${state.replace('_', '-')}`, authenticate, requireRole('host', 'admin'), (req, res) => {
      try {
        const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

        db.prepare('UPDATE tournaments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(state, req.params.id);
        const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
        createAuditLog(db, 'tournaments', req.params.id, 'status_change', tournament, updated);

        res.json(updated);
      } catch (err) {
        res.status(500).json({ error: `Failed to transition to ${state}`, message: err.message });
      }
    });
  });

  return router;
}

module.exports = createTournamentRoutes;
