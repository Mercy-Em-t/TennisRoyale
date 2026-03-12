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
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

function createTournamentRoutes(db) {
  const router = express.Router();

  // List all tournaments (public) - includes host name
  router.get('/', (req, res) => {
    const tournaments = db.prepare(`
      SELECT t.*, u.name as host_name
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tournaments);
  });

  // Get single tournament with stats (public)
  router.get('/:id', (req, res) => {
    const tournament = db.prepare(`
      SELECT t.*, u.name as host_name
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `).get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const registrationCount = db.prepare(
      'SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const matchCount = db.prepare(
      'SELECT COUNT(*) as count FROM matches WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const completedMatches = db.prepare(
      "SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND status = 'completed'"
    ).get(req.params.id).count;

    const poolCount = db.prepare(
      'SELECT COUNT(*) as count FROM pools WHERE tournament_id = ?'
    ).get(req.params.id).count;

    const staffCount = db.prepare(
      'SELECT COUNT(*) as count FROM tournament_staff WHERE tournament_id = ?'
    ).get(req.params.id).count;

    // Payment/earnings info
    const paymentStats = db.prepare(`
      SELECT
        COALESCE(SUM(total_paid), 0) as total_collected,
        COALESCE(SUM(platform_amount), 0) as platform_total,
        COALESCE(SUM(host_amount), 0) as host_total,
        COUNT(*) as payment_count
      FROM payments WHERE tournament_id = ?
    `).get(req.params.id);

    const withdrawnAmount = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM host_withdrawals
      WHERE tournament_id = ? AND status = 'completed'
    `).get(req.params.id).total;

    res.json({
      ...tournament,
      stats: {
        registrations: registrationCount,
        matches: matchCount,
        completedMatches,
        pools: poolCount,
        staff: staffCount
      },
      earnings: {
        total_collected: paymentStats.total_collected,
        platform_total: paymentStats.platform_total,
        host_total: paymentStats.host_total,
        withdrawn: withdrawnAmount,
        available: paymentStats.host_total - withdrawnAmount,
        payment_count: paymentStats.payment_count
      }
    });
  });

  // Create tournament (host only)
  router.post('/', requireRole('host'), (req, res) => {
    const { name, date, location, max_participants, fee, service_fee, prize_pool, registration_deadline, rules, bracket_type, poster_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tournaments (id, name, date, location, max_participants, fee, service_fee, prize_pool, registration_deadline, rules, bracket_type, poster_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, date || null, location || null, max_participants || 32,
      fee || 0, service_fee || 0, prize_pool || 0,
      registration_deadline || null, rules || null, bracket_type || 'single_elimination',
      poster_url || null, req.user.id
    );

    const tournament = db.prepare(`
      SELECT t.*, u.name as host_name
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `).get(id);
    res.status(201).json(tournament);
  });

  // Update tournament (host only)
  router.put('/:id', requireRole('host'), (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const { name, date, location, max_participants, fee, service_fee, prize_pool, registration_deadline, rules, bracket_type, poster_url, status, late_registration_open } = req.body;

    db.prepare(`
      UPDATE tournaments SET
        name = COALESCE(?, name),
        date = COALESCE(?, date),
        location = COALESCE(?, location),
        max_participants = COALESCE(?, max_participants),
        fee = COALESCE(?, fee),
        service_fee = COALESCE(?, service_fee),
        prize_pool = COALESCE(?, prize_pool),
        registration_deadline = COALESCE(?, registration_deadline),
        rules = COALESCE(?, rules),
        bracket_type = COALESCE(?, bracket_type),
        poster_url = COALESCE(?, poster_url),
        status = COALESCE(?, status),
        late_registration_open = COALESCE(?, late_registration_open),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name || null, date || null, location || null,
      max_participants || null, fee != null ? fee : null,
      service_fee != null ? service_fee : null,
      prize_pool != null ? prize_pool : null,
      registration_deadline || null, rules || null, bracket_type || null,
      poster_url || null,
      status || null, late_registration_open != null ? late_registration_open : null,
      req.params.id
    );

    const updated = db.prepare(`
      SELECT t.*, u.name as host_name
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = ?
    `).get(req.params.id);
    res.json(updated);
  });

  // Delete tournament (host only)
  router.delete('/:id', requireRole('host'), (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    db.prepare('DELETE FROM host_withdrawals WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM payments WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournament_messages WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournament_staff WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM pool_players WHERE pool_id IN (SELECT id FROM pools WHERE tournament_id = ?)').run(req.params.id);
    db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM registrations WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);

    res.json({ message: 'Tournament deleted' });
  });

  return router;
}

module.exports = createRouter;
module.exports = createTournamentRoutes;
