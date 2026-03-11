const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/tournaments - List all tournaments
  router.get('/', (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      let sql = 'SELECT * FROM tournaments';
      const params = [];
      
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const tournaments = db.prepare(sql).all(...params);
      res.json(tournaments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id - Get a specific tournament
  router.get('/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments - Create a new tournament
  router.post('/', (req, res) => {
    try {
      const { name, description, location, start_date, end_date, max_players, entry_fee } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Tournament name is required' });
      }

      const stmt = db.prepare(`
        INSERT INTO tournaments (name, description, location, start_date, end_date, max_players, entry_fee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(name, description, location, start_date, end_date, max_players || 32, entry_fee || 0);
      
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'tournaments', tournament.id, 'create', null, tournament);
      
      res.status(201).json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/tournaments/:id - Update a tournament
  router.put('/:id', (req, res) => {
    try {
      const oldTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!oldTournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const { name, description, location, start_date, end_date, max_players, entry_fee } = req.body;
      
      const stmt = db.prepare(`
        UPDATE tournaments SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          max_players = COALESCE(?, max_players),
          entry_fee = COALESCE(?, entry_fee),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(name, description, location, start_date, end_date, max_players, entry_fee, req.params.id);
      
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', tournament.id, 'update', oldTournament, tournament);
      
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/tournaments/:id - Delete a tournament
  router.delete('/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'tournaments', tournament.id, 'delete', tournament, null);
      
      res.json({ message: 'Tournament deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/open-registration - Open registration for a tournament
  router.post('/:id/open-registration', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Can only open registration for draft tournaments' });
      }

      db.prepare(`UPDATE tournaments SET status = 'registration_open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/close-registration - Close registration
  router.post('/:id/close-registration', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'registration_open') {
        return res.status(400).json({ error: 'Can only close registration for tournaments with open registration' });
      }

      db.prepare(`UPDATE tournaments SET status = 'registration_closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/start - Start the tournament
  router.post('/:id/start', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'registration_closed') {
        return res.status(400).json({ error: 'Can only start tournaments with closed registration' });
      }

      db.prepare(`UPDATE tournaments SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      // Broadcast to WebSocket clients
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(parseInt(req.params.id), { type: 'tournament_started', tournament: updated });
      }
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/complete - Complete the tournament
  router.post('/:id/complete', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'in_progress') {
        return res.status(400).json({ error: 'Can only complete tournaments that are in progress' });
      }

      db.prepare(`UPDATE tournaments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      // Broadcast to WebSocket clients
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(parseInt(req.params.id), { type: 'tournament_completed', tournament: updated });
      }
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/archive - Archive the tournament
  router.post('/:id/archive', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
        return res.status(400).json({ error: 'Can only archive completed or cancelled tournaments' });
      }

      db.prepare(`UPDATE tournaments SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/standings - Get tournament standings
  router.get('/:id/standings', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const standings = db.prepare(`
        SELECT 
          p.id as player_id,
          p.first_name,
          p.last_name,
          r.id as registration_id,
          r.seed,
          pp.wins,
          pp.losses,
          pp.games_won,
          pp.games_lost,
          pp.points_won,
          pp.points_lost,
          po.name as pool_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN pool_players pp ON r.id = pp.registration_id
        LEFT JOIN pools po ON pp.pool_id = po.id
        WHERE r.tournament_id = ?
        ORDER BY pp.wins DESC, (pp.games_won - pp.games_lost) DESC, pp.points_won DESC
      `).all(req.params.id);

      res.json({ tournament, standings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
