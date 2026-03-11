const express = require('express');
const { customAlphabet } = require('nanoid');
const { createAuditLog } = require('../models/database');

// Generate unique QR codes
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12);

function createRouter(db) {
  const router = express.Router();

  // GET /api/registrations - List registrations (optionally filtered by tournament)
  router.get('/', (req, res) => {
    try {
      const { tournament_id, status, limit = 100, offset = 0 } = req.query;
      let sql = `
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone
        FROM registrations r
        JOIN players p ON r.player_id = p.id
      `;
      const params = [];
      const conditions = [];
      
      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      
      if (status) {
        conditions.push('r.status = ?');
        params.push(status);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY r.registration_date ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const registrations = db.prepare(sql).all(...params);
      res.json(registrations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/registrations/:id - Get a specific registration
  router.get('/:id', (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.skill_level,
               t.name as tournament_name, t.status as tournament_status
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/registrations - Register a player for a tournament
  router.post('/', (req, res) => {
    try {
      const { tournament_id, player_id, seed } = req.body;
      
      if (!tournament_id || !player_id) {
        return res.status(400).json({ error: 'Tournament ID and Player ID are required' });
      }

      // Check tournament exists and is open for registration
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      const isLate = tournament.status === 'in_progress';
      if (tournament.status !== 'registration_open' && !isLate) {
        return res.status(400).json({ error: 'Tournament is not open for registration' });
      }

      // Check player exists
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Check if already registered
      const existing = db.prepare('SELECT id FROM registrations WHERE tournament_id = ? AND player_id = ?')
        .get(tournament_id, player_id);
      if (existing) {
        return res.status(409).json({ error: 'Player is already registered for this tournament', registration_id: existing.id });
      }

      // Check max players
      const registrationCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ?')
        .get(tournament_id);
      if (registrationCount.count >= tournament.max_players) {
        return res.status(400).json({ error: 'Tournament has reached maximum capacity' });
      }

      // Generate unique QR code
      const qr_code = `TR-${tournament_id}-${nanoid()}`;

      const stmt = db.prepare(`
        INSERT INTO registrations (tournament_id, player_id, seed, is_late, qr_code, payment_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(tournament_id, player_id, seed, isLate ? 1 : 0, qr_code, tournament.entry_fee);
      
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.id = ?
      `).get(result.lastInsertRowid);
      
      createAuditLog(db, 'registrations', registration.id, 'create', null, registration);
      
      res.status(201).json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/registrations/:id - Update a registration
  router.put('/:id', (req, res) => {
    try {
      const oldRegistration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!oldRegistration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      const { seed, status, payment_status } = req.body;
      
      const stmt = db.prepare(`
        UPDATE registrations SET
          seed = COALESCE(?, seed),
          status = COALESCE(?, status),
          payment_status = COALESCE(?, payment_status)
        WHERE id = ?
      `);
      
      stmt.run(seed, status, payment_status, req.params.id);
      
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.id = ?
      `).get(req.params.id);
      
      createAuditLog(db, 'registrations', registration.id, 'update', oldRegistration, registration);
      
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/registrations/:id - Cancel a registration
  router.delete('/:id', (req, res) => {
    try {
      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // Check if tournament has started
      const tournament = db.prepare('SELECT status FROM tournaments WHERE id = ?').get(registration.tournament_id);
      if (tournament.status === 'in_progress' || tournament.status === 'completed') {
        // Soft delete - mark as withdrawn
        db.prepare(`UPDATE registrations SET status = 'withdrawn' WHERE id = ?`).run(req.params.id);
        
        const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
        createAuditLog(db, 'registrations', updated.id, 'update', registration, updated);
        
        return res.json({ message: 'Registration withdrawn', registration: updated });
      }

      db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'registrations', registration.id, 'delete', registration, null);
      
      res.json({ message: 'Registration cancelled', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/registrations/by-qr/:qr_code - Get registration by QR code
  router.get('/by-qr/:qr_code', (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.photo_url,
               t.name as tournament_name, t.status as tournament_status, t.location
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.qr_code = ?
      `).get(req.params.qr_code);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
