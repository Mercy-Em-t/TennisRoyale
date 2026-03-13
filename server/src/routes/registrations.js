const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Registration Routes Factory
 */
function createRegistrationRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/registrations - List all registrations with optional filtering
  router.get('/', (req, res) => {
    try {
      const tournament_id = req.params.tournamentId || req.query.tournament_id;
      const { player_id, status, limit = 100, offset = 0 } = req.query;
      let sql = `
        SELECT r.*, p.first_name, p.last_name, p.name, p.email, t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
      `;
      const params = [];
      const conditions = [];

      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      if (player_id) {
        conditions.push('r.player_id = ?');
        params.push(player_id);
      }
      if (status) {
        conditions.push('r.status = ?');
        params.push(status);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY r.registration_date DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const registrations = db.prepare(sql).all(...params);
      res.json(registrations);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch registrations', message: err.message });
    }
  });

  // POST /api/registrations - Register a player (public or host)
  router.post('/', (req, res) => {
    try {
      const tournament_id = req.params.tournamentId || req.body.tournament_id;
      const { player_id, seed } = req.body;
      if (!tournament_id || !player_id) {
        return res.status(400).json({ error: 'tournament_id and player_id are required' });
      }

      // Check tournament status
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

      const isLate = (tournament.status !== 'registration_open');
      if (tournament.status !== 'registration_open' && tournament.status !== 'registration_closed' && tournament.status !== 'in_progress') {
        return res.status(400).json({ error: 'Tournament is not accepting registrations' });
      }

      // Check duplicate
      const existing = db.prepare('SELECT id FROM registrations WHERE tournament_id = ? AND player_id = ?').get(tournament_id, player_id);
      if (existing) return res.status(409).json({ error: 'Player already registered' });

      const id = uuidv4();
      db.prepare(`
        INSERT INTO registrations (id, tournament_id, player_id, seed, is_late, status)
        VALUES (?, ?, ?, ?, ?, 'registered')
      `).run(id, tournament_id, player_id, seed || null, isLate ? 1 : 0);

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
      createAuditLog(db, 'registrations', id, 'create', null, registration);

      res.status(201).json(registration);
    } catch (err) {
      res.status(500).json({ error: 'Failed to register', message: err.message });
    }
  });

  // GET /api/registrations/:id - Details
  router.get('/:id', (req, res) => {
    try {
      const reg = db.prepare(`
        SELECT r.*, p.name as player_name, p.email as player_email, t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(req.params.id);
      if (!reg) return res.status(404).json({ error: 'Registration not found' });
      res.json(reg);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch registration', message: err.message });
    }
  });

  // PATCH /api/registrations/:id - Update status/seed (host only)
  router.patch('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const oldReg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!oldReg) return res.status(404).json({ error: 'Registration not found' });

      const { status, seed, payment_status, check_in_time } = req.body;
      db.prepare(`
        UPDATE registrations SET
          status = COALESCE(?, status),
          seed = COALESCE(?, seed),
          payment_status = COALESCE(?, payment_status),
          check_in_time = COALESCE(?, check_in_time),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, seed, payment_status, check_in_time, req.params.id);

      const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'registrations', req.params.id, 'update', oldReg, updated);

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update registration', message: err.message });
    }
  });

  // DELETE /api/registrations/:id
  router.delete('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const reg = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!reg) return res.status(404).json({ error: 'Registration not found' });

      db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
      createAuditLog(db, 'registrations', req.params.id, 'delete', reg, null);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete registration', message: err.message });
    }
  });

  return router;
}

module.exports = createRegistrationRoutes;
