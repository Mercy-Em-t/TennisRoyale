const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/courts - List courts (optionally filtered by tournament)
  router.get('/', (req, res) => {
    try {
      const { tournament_id, is_available } = req.query;
      let sql = 'SELECT * FROM courts';
      const params = [];
      const conditions = [];
      
      if (tournament_id) {
        conditions.push('tournament_id = ?');
        params.push(tournament_id);
      }
      
      if (is_available !== undefined) {
        conditions.push('is_available = ?');
        params.push(is_available === 'true' ? 1 : 0);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY name ASC';
      
      const courts = db.prepare(sql).all(...params);
      res.json(courts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/courts/:id - Get a specific court with current match
  router.get('/:id', (req, res) => {
    try {
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      // Get current match on this court
      const currentMatch = db.prepare(`
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.court_id = ? AND m.status = 'in_progress'
      `).get(req.params.id);

      // Get upcoming matches on this court
      const upcomingMatches = db.prepare(`
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.court_id = ? AND m.status = 'scheduled'
        ORDER BY m.scheduled_time ASC
        LIMIT 5
      `).all(req.params.id);

      res.json({ ...court, current_match: currentMatch || null, upcoming_matches: upcomingMatches });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/courts - Create a new court
  router.post('/', (req, res) => {
    try {
      const { tournament_id, name, surface, location, notes } = req.body;
      
      if (!tournament_id || !name) {
        return res.status(400).json({ error: 'Tournament ID and court name are required' });
      }

      // Check tournament exists
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const stmt = db.prepare(`
        INSERT INTO courts (tournament_id, name, surface, location, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(tournament_id, name, surface, location, notes);
      
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'courts', court.id, 'create', null, court);
      
      res.status(201).json(court);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/courts/:id - Update a court
  router.put('/:id', (req, res) => {
    try {
      const oldCourt = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      if (!oldCourt) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const { name, surface, location, is_available, notes } = req.body;
      
      const stmt = db.prepare(`
        UPDATE courts SET
          name = COALESCE(?, name),
          surface = COALESCE(?, surface),
          location = COALESCE(?, location),
          is_available = COALESCE(?, is_available),
          notes = COALESCE(?, notes)
        WHERE id = ?
      `);
      
      stmt.run(name, surface, location, is_available, notes, req.params.id);
      
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'courts', court.id, 'update', oldCourt, court);
      
      // Broadcast court status update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(court.tournament_id, { type: 'court_updated', court });
      }
      
      res.json(court);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/courts/:id - Delete a court
  router.delete('/:id', (req, res) => {
    try {
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      // Check if court has scheduled matches
      const matches = db.prepare('SELECT COUNT(*) as count FROM matches WHERE court_id = ? AND status IN ("scheduled", "in_progress")')
        .get(req.params.id);
      if (matches.count > 0) {
        return res.status(400).json({ error: 'Cannot delete court with scheduled or in-progress matches' });
      }

      db.prepare('DELETE FROM courts WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'courts', court.id, 'delete', court, null);
      
      res.json({ message: 'Court deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/courts/:id/assign-match - Assign a match to this court
  router.post('/:id/assign-match', (req, res) => {
    try {
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }
      if (!court.is_available) {
        return res.status(400).json({ error: 'Court is not available' });
      }

      const { match_id, scheduled_time } = req.body;
      
      if (!match_id) {
        return res.status(400).json({ error: 'Match ID is required' });
      }

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      // Check for conflicts
      if (scheduled_time) {
        const conflict = db.prepare(`
          SELECT * FROM matches 
          WHERE court_id = ? AND scheduled_time = ? AND status IN ('scheduled', 'in_progress') AND id != ?
        `).get(req.params.id, scheduled_time, match_id);
        
        if (conflict) {
          return res.status(409).json({ error: 'Court is already booked at this time', conflicting_match: conflict });
        }
      }

      db.prepare(`
        UPDATE matches SET court_id = ?, scheduled_time = COALESCE(?, scheduled_time), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.params.id, scheduled_time, match_id);

      const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);

      // Broadcast update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'match_scheduled', match: updatedMatch, court });
      }

      res.json({ message: 'Match assigned to court', match: updatedMatch });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/courts/:id/schedule - Get court schedule
  router.get('/:id/schedule', (req, res) => {
    try {
      const court = db.prepare('SELECT * FROM courts WHERE id = ?').get(req.params.id);
      if (!court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const { date } = req.query;
      
      let sql = `
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.court_id = ?
      `;
      const params = [req.params.id];
      
      if (date) {
        sql += ` AND date(m.scheduled_time) = date(?)`;
        params.push(date);
      }
      
      sql += ' ORDER BY m.scheduled_time ASC';
      
      const schedule = db.prepare(sql).all(...params);
      
      res.json({ court, schedule });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/courts/bulk-create - Create multiple courts at once
  router.post('/bulk-create', (req, res) => {
    try {
      const { tournament_id, courts } = req.body;
      
      if (!tournament_id || !courts || !Array.isArray(courts)) {
        return res.status(400).json({ error: 'Tournament ID and courts array are required' });
      }

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const createCourts = db.transaction(() => {
        const created = [];
        courts.forEach((court, index) => {
          const result = db.prepare(`
            INSERT INTO courts (tournament_id, name, surface, location, notes)
            VALUES (?, ?, ?, ?, ?)
          `).run(tournament_id, court.name || `Court ${index + 1}`, court.surface, court.location, court.notes);
          
          created.push(db.prepare('SELECT * FROM courts WHERE id = ?').get(result.lastInsertRowid));
        });
        return created;
      });

      const createdCourts = createCourts();
      
      res.status(201).json({ 
        message: `Created ${createdCourts.length} courts`,
        courts: createdCourts 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
