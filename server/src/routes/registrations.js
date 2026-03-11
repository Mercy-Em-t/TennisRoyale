const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

function createRegistrationRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // List registrations for a tournament
  router.get('/', (req, res) => {
    const registrations = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r
      JOIN players p ON r.player_id = p.id
      WHERE r.tournament_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.tournamentId);
    res.json(registrations);
  });

  // Register a player
  router.post('/', (req, res) => {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const validStatuses = ['registration_open'];
    if (tournament.late_registration_open) validStatuses.push('registration_closed', 'in_progress');
    if (!validStatuses.includes(tournament.status)) {
      return res.status(400).json({ error: 'Registration is not open' });
    }

    const regCount = db.prepare(
      'SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ?'
    ).get(req.params.tournamentId).count;
    if (regCount >= tournament.max_participants) {
      return res.status(400).json({ error: 'Tournament is full' });
    }

    // Get or create player
    let player = db.prepare('SELECT * FROM players WHERE email = ?').get(email);
    if (!player) {
      const playerId = uuidv4();
      db.prepare('INSERT INTO players (id, name, email) VALUES (?, ?, ?)').run(playerId, name, email);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    }

    // Check duplicate registration
    const existing = db.prepare(
      'SELECT * FROM registrations WHERE tournament_id = ? AND player_id = ?'
    ).get(req.params.tournamentId, player.id);
    if (existing) return res.status(400).json({ error: 'Player already registered' });

    const regId = uuidv4();
    const isLate = tournament.status !== 'registration_open' ? 1 : 0;
    db.prepare(
      'INSERT INTO registrations (id, tournament_id, player_id, is_late) VALUES (?, ?, ?, ?)'
    ).run(regId, req.params.tournamentId, player.id, isLate);

    // Create payment record if there's an entry fee
    const entryFee = tournament.fee || 0;
    const serviceFee = tournament.service_fee || 0;
    const totalPaid = entryFee + serviceFee;

    if (totalPaid > 0) {
      const platformFeePercent = tournament.platform_fee_percent || 10;
      const platformAmount = Math.round((entryFee * platformFeePercent / 100) * 100) / 100 + serviceFee;
      const hostAmount = Math.round((entryFee - (entryFee * platformFeePercent / 100)) * 100) / 100;

      const paymentId = uuidv4();
      db.prepare(`
        INSERT INTO payments (id, tournament_id, registration_id, player_id, entry_fee, service_fee, total_paid, platform_amount, host_amount, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'held')
      `).run(paymentId, req.params.tournamentId, regId, player.id, entryFee, serviceFee, totalPaid, platformAmount, hostAmount);
    }

    const registration = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r JOIN players p ON r.player_id = p.id
      WHERE r.id = ?
    `).get(regId);

    // Include payment info in response
    const payment = db.prepare('SELECT * FROM payments WHERE registration_id = ?').get(regId);
    res.status(201).json({ ...registration, payment: payment || null });
  });

  // Remove registration (host only)
  router.delete('/:regId', requireRole('host'), (req, res) => {
    const reg = db.prepare('SELECT * FROM registrations WHERE id = ? AND tournament_id = ?')
      .get(req.params.regId, req.params.tournamentId);
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.regId);
    res.json({ message: 'Registration removed' });
  });

  return router;
}

module.exports = createRegistrationRoutes;
