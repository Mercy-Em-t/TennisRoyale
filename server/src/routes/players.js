const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/players - List all players
  router.get('/', (req, res) => {
    try {
      const { search, limit = 50, offset = 0 } = req.query;
      let sql = 'SELECT * FROM players';
      const params = [];
      
      if (search) {
        sql += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ?`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      sql += ' ORDER BY last_name, first_name LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const players = db.prepare(sql).all(...params);
      res.json(players);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/players/:id - Get a specific player
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

  // POST /api/players - Create a new player
  router.post('/', (req, res) => {
    try {
      const { first_name, last_name, email, phone, date_of_birth, skill_level, photo_url } = req.body;
      
      if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
      }

      // Check if email already exists
      const existing = db.prepare('SELECT id FROM players WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'A player with this email already exists', player_id: existing.id });
      }

      const stmt = db.prepare(`
        INSERT INTO players (first_name, last_name, email, phone, date_of_birth, skill_level, photo_url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(first_name, last_name, email, phone, date_of_birth, skill_level, photo_url);
      
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'players', player.id, 'create', null, player);
      
      res.status(201).json(player);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/players/:id - Update a player
  router.put('/:id', (req, res) => {
    try {
      const oldPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!oldPlayer) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const { first_name, last_name, email, phone, date_of_birth, skill_level, photo_url } = req.body;
      
      // Check email uniqueness if changing
      if (email && email !== oldPlayer.email) {
        const existing = db.prepare('SELECT id FROM players WHERE email = ? AND id != ?').get(email, req.params.id);
        if (existing) {
          return res.status(409).json({ error: 'A player with this email already exists' });
        }
      }

      const stmt = db.prepare(`
        UPDATE players SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          date_of_birth = COALESCE(?, date_of_birth),
          skill_level = COALESCE(?, skill_level),
          photo_url = COALESCE(?, photo_url)
        WHERE id = ?
      `);
      
      stmt.run(first_name, last_name, email, phone, date_of_birth, skill_level, photo_url, req.params.id);
      
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'players', player.id, 'update', oldPlayer, player);
      
      res.json(player);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/players/:id - Delete a player
  router.delete('/:id', (req, res) => {
    try {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Check if player has registrations
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

  // GET /api/players/:id/tournaments - Get tournaments a player is registered in
  router.get('/:id/tournaments', (req, res) => {
    try {
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      const tournaments = db.prepare(`
        SELECT t.*, r.registration_date, r.status as registration_status, r.seed, r.payment_status
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

module.exports = createRouter;
