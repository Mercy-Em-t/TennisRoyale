const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Players Route Factory
 * Handles all player-related operations including:
 * - Listing players with search and pagination
 * - CRUD operations for player profiles
 * - Fetching player tournament participation history
 */
function createPlayerRoutes(db) {
  const router = express.Router();

  // GET /api/players - List all players with search
  router.get('/', (req, res) => {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      let sql = 'SELECT * FROM players';
      const params = [];

      if (search) {
        sql += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR name LIKE ?`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ' ORDER BY last_name, first_name LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const players = db.prepare(sql).all(...params);
      res.json(players);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/players/:id - Get specific player details
  router.get('/:id', (req, res) => {
    try {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
      res.json(player);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/players - Create new player (host or registration)
  router.post('/', (req, res) => {
    try {
      const { first_name, last_name, name, email, phone, skill_level } = req.body;

      if (!email || (!name && (!first_name || !last_name))) {
        return res.status(400).json({ error: 'Email and name (or first/last name) are required' });
      }

      const existing = db.prepare('SELECT id FROM players WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'Player email already exists', player_id: existing.id });
      }

      const id = uuidv4();
      const displayName = name || `${first_name} ${last_name}`;

      db.prepare(`
        INSERT INTO players (id, first_name, last_name, name, email, phone, skill_level)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, first_name || null, last_name || null, displayName, email, phone || null, skill_level || null);

      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
      createAuditLog(db, 'players', player.id, 'create', null, player);

      res.status(201).json(player);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id - Update player profile
  router.put('/:id', authenticate, (req, res) => {
    try {
      const oldPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!oldPlayer) return res.status(404).json({ error: 'Player not found' });

      // Permissions: host can update any, player can only update self (if linked to user)
      if (req.user.role !== 'host' && req.user.role !== 'admin' && oldPlayer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const { first_name, last_name, name, email, phone, skill_level } = req.body;

      if (email && email !== oldPlayer.email) {
        const existing = db.prepare('SELECT id FROM players WHERE email = ? AND id != ?').get(email, req.params.id);
        if (existing) return res.status(409).json({ error: 'Email already in use' });
      }

      db.prepare(`
        UPDATE players SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          skill_level = COALESCE(?, skill_level)
        WHERE id = ?
      `).run(first_name, last_name, name, email, phone, skill_level, req.params.id);

      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'players', player.id, 'update', oldPlayer, player);

      res.json(player);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/players/:id (host only)
  router.delete('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!player) return res.status(404).json({ error: 'Player not found' });

      const registrations = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE player_id = ?').get(req.params.id);
      if (registrations.count > 0) {
        return res.status(400).json({ error: 'Cannot delete player with existing registrations' });
      }

      db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
      createAuditLog(db, 'players', player.id, 'delete', player, null);
      res.json({ message: 'Player deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/players/:id/tournaments - Get player history
  router.get('/:id/tournaments', (req, res) => {
    try {
      const tournaments = db.prepare(`
        SELECT t.*, r.registration_date, r.status as reg_status, r.payment_status
        FROM tournaments t
        JOIN registrations r ON t.id = r.tournament_id
        WHERE r.player_id = ?
        ORDER BY t.start_date DESC
      `).all(req.params.id);
      res.json(tournaments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createPlayerRoutes;
module.exports.createPlayerRoutes = createPlayerRoutes;
