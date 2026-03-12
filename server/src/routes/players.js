const express = require('express');
const crypto = require('crypto');
const { PLAYER_STATES, canTransitionPlayer } = require('../models/states');

function createPlayerRoutes(db) {
  const router = express.Router();

  // Create a player/team
  router.post('/', (req, res) => {
    const { name, type } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const playerType = type || 'single';
    if (!['single', 'team'].includes(playerType)) {
      return res.status(400).json({ error: 'Type must be "single" or "team"' });
    }

    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO players (id, name, type, status) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, playerType, PLAYER_STATES.REGISTERED);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    res.status(201).json(player);
  });

  // Get all players
  router.get('/', (req, res) => {
    const players = db.prepare('SELECT * FROM players').all();
    res.json(players);
  });

  // Get a single player
  router.get('/:id', (req, res) => {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  });

  // Update player status (state transition)
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!canTransitionPlayer(player.status, status)) {
      return res.status(400).json({
        error: `Invalid state transition from "${player.status}" to "${status}"`,
      });
    }

    db.prepare('UPDATE players SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Add team members (for team type players)
  router.post('/:id/members', (req, res) => {
    const { player_name } = req.body;
    if (!player_name) {
      return res.status(400).json({ error: 'player_name is required' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player/Team not found' });
    }
    if (player.type !== 'team') {
      return res.status(400).json({ error: 'Can only add members to teams' });
    }

    const memberId = crypto.randomUUID();
    db.prepare('INSERT INTO team_members (id, team_id, player_name) VALUES (?, ?, ?)').run(memberId, req.params.id, player_name);

    const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(req.params.id);
    res.status(201).json(members);
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

module.exports = { createPlayerRoutes };
module.exports = createRouter;
