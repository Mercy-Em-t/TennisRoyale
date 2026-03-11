const express = require('express');
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

module.exports = createTournamentRoutes;
