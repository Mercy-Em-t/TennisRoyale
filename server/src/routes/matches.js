const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Matches Route Factory
 * Handles all match-related operations including:
 * - Listing matches with filters (tournament, pool, court, status)
 * - CRUD operations for matches
 * - Scheduling and Status management
 * - Scoring and Pool Standings updates
 * - Bracket generation and advancement
 */
function createMatchRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/matches - List matches (with filtering)
  router.get('/', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.query.tournament_id;
      const { pool_id, court_id, status, bracket_stage, limit = 100, offset = 0 } = req.query;

      let sql = `
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name,
               c.name as court_name, po.name as pool_name,
               w.first_name as winner_first_name, w.last_name as winner_last_name
        FROM matches m
        LEFT JOIN registrations r1 ON m.player1_registration_id = r1.id
        LEFT JOIN players p1 ON r1.player_id = p1.id
        LEFT JOIN registrations r2 ON m.player2_registration_id = r2.id
        LEFT JOIN players p2 ON r2.player_id = p2.id
        LEFT JOIN players w ON m.winner_registration_id = w.id
        LEFT JOIN courts c ON m.court_id = c.id
        LEFT JOIN pools po ON m.pool_id = po.id
      `;

      const params = [];
      const conditions = [];

      if (tournamentId) {
        conditions.push('m.tournament_id = ?');
        params.push(tournamentId);
      }
      if (pool_id) {
        conditions.push('m.pool_id = ?');
        params.push(pool_id);
      }
      if (court_id) {
        conditions.push('m.court_id = ?');
        params.push(court_id);
      }
      if (status) {
        conditions.push('m.status = ?');
        params.push(status);
      }
      if (bracket_stage) {
        conditions.push('m.bracket_stage = ?');
        params.push(bracket_stage);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY m.scheduled_time ASC, m.match_number ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const matches = db.prepare(sql).all(...params);
      res.json(matches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/matches/:id - Get a specific match
  router.get('/:id', (req, res) => {
    try {
      const match = db.prepare(`
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name,
               c.name as court_name, po.name as pool_name,
               t.name as tournament_name
        FROM matches m
        LEFT JOIN registrations r1 ON m.player1_registration_id = r1.id
        LEFT JOIN players p1 ON r1.player_id = p1.id
        LEFT JOIN registrations r2 ON m.player2_registration_id = r2.id
        LEFT JOIN players p2 ON r2.player_id = p2.id
        LEFT JOIN courts c ON m.court_id = c.id
        LEFT JOIN pools po ON m.pool_id = po.id
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.id = ?
      `).get(req.params.id);

      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches - Create a new match (host only)
  router.post('/', authenticate, requireRole('host'), (req, res) => {
    try {
      const {
        tournament_id, pool_id, court_id,
        player1_registration_id, player2_registration_id,
        scheduled_time, bracket_stage, bracket_position, round_number, match_number
      } = req.body;

      const combinedTournamentId = tournament_id || req.params.tournamentId;

      if (!combinedTournamentId || !player1_registration_id || !player2_registration_id) {
        return res.status(400).json({ error: 'Tournament ID and both player registration IDs are required' });
      }

      const id = uuidv4();
      const stmt = db.prepare(`
        INSERT INTO matches (
          id, tournament_id, pool_id, court_id,
          player1_registration_id, player2_registration_id,
          scheduled_time, bracket_stage, bracket_position, round_number, match_number, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
      `);

      stmt.run(
        id, combinedTournamentId, pool_id || null, court_id || null,
        player1_registration_id, player2_registration_id,
        scheduled_time || null, bracket_stage || 'pool', bracket_position || null, round_number || 1, match_number || null
      );

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
      createAuditLog(db, 'matches', match.id, 'create', null, match);

      res.status(201).json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id - Update a match (scheduling/notes)
  router.put('/:id', authenticate, requireRole('host', 'referee'), (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const { court_id, scheduled_time, notes, status } = req.body;

      const stmt = db.prepare(`
        UPDATE matches SET
          court_id = COALESCE(?, court_id),
          scheduled_time = COALESCE(?, scheduled_time),
          notes = COALESCE(?, notes),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      stmt.run(court_id, scheduled_time, notes, status, req.params.id);

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);

      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'match_updated', match });
      }

      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/:id/start - Start a match
  router.post('/:id/start', authenticate, requireRole('host', 'referee'), (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) return res.status(404).json({ error: 'Match not found' });
      if (oldMatch.status !== 'scheduled') return res.status(400).json({ error: 'Match is not scheduled' });

      db.prepare(`
        UPDATE matches SET status = 'in_progress', actual_start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.params.id);

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);

      const broadcast = req.app.get('broadcast');
      if (broadcast) broadcast(match.tournament_id, { type: 'match_started', match });

      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/:id/score - Update match score
  router.post('/:id/score', authenticate, requireRole('host', 'referee'), (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) return res.status(404).json({ error: 'Match not found' });

      const { player1_score, player2_score, winner_registration_id, status } = req.body;
      const newStatus = winner_registration_id ? 'completed' : (status || oldMatch.status);

      db.prepare(`
        UPDATE matches SET
          player1_score = COALESCE(?, player1_score),
          player2_score = COALESCE(?, player2_score),
          winner_registration_id = COALESCE(?, winner_registration_id),
          status = ?,
          actual_end_time = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE actual_end_time END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(player1_score, player2_score, winner_registration_id, newStatus, winner_registration_id, req.params.id);

      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);

      if (winner_registration_id && match.pool_id) {
        updatePoolStandings(db, match);
      }

      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, {
          type: winner_registration_id ? 'match_completed' : 'score_update',
          match
        });
      }

      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Pool Standings Helper
  function updatePoolStandings(db, match) {
    const scores1 = parseScore(match.player1_score);
    const scores2 = parseScore(match.player2_score);
    const winner = match.winner_registration_id;
    const loser = (winner === match.player1_registration_id) ? match.player2_registration_id : match.player1_registration_id;
    const p1Games = scores1.reduce((a, b) => a + b, 0);
    const p2Games = scores2.reduce((a, b) => a + b, 0);

    db.prepare(`
      UPDATE pool_players SET wins = wins + 1, games_won = games_won + ?, games_lost = games_lost + ?
      WHERE pool_id = ? AND registration_id = ?
    `).run((winner === match.player1_registration_id) ? p1Games : p2Games, (winner === match.player1_registration_id) ? p2Games : p1Games, match.pool_id, winner);

    db.prepare(`
      UPDATE pool_players SET losses = losses + 1, games_won = games_won + ?, games_lost = games_lost + ?
      WHERE pool_id = ? AND registration_id = ?
    `).run((loser === match.player1_registration_id) ? p1Games : p2Games, (loser === match.player1_registration_id) ? p2Games : p1Games, match.pool_id, loser);
  }

  function parseScore(scoreStr) {
    if (!scoreStr) return [0];
    try {
      return scoreStr.split(',').map(set => parseInt(set.split('-')[0]) || 0);
    } catch { return [0]; }
  }

  // DELETE /api/matches/:id
  router.delete('/:id', authenticate, requireRole('host'), (req, res) => {
    try {
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!match) return res.status(404).json({ error: 'Match not found' });

      db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
      createAuditLog(db, 'matches', match.id, 'delete', match, null);
      res.json({ message: 'Match deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createMatchRoutes;
