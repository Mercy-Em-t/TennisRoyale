const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

function createPaymentRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // Get payments for a tournament
  router.get('/', (req, res) => {
    const payments = db.prepare(`
      SELECT pay.*, p.name as player_name, p.email as player_email
      FROM payments pay
      JOIN players p ON pay.player_id = p.id
      WHERE pay.tournament_id = ?
      ORDER BY pay.created_at DESC
    `).all(req.params.tournamentId);
    res.json(payments);
  });

  // Get earnings summary for a tournament (host only)
  router.get('/earnings', requireRole('host'), (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const paymentStats = db.prepare(`
      SELECT
        COALESCE(SUM(total_paid), 0) as total_collected,
        COALESCE(SUM(platform_amount), 0) as platform_total,
        COALESCE(SUM(host_amount), 0) as host_total,
        COUNT(*) as payment_count
      FROM payments WHERE tournament_id = ?
    `).get(req.params.tournamentId);

    const withdrawals = db.prepare(`
      SELECT * FROM host_withdrawals
      WHERE tournament_id = ?
      ORDER BY created_at DESC
    `).all(req.params.tournamentId);

    const withdrawnAmount = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + w.amount, 0);

    // Funds are only available for withdrawal when tournament is completed
    const canWithdraw = ['completed', 'archived'].includes(tournament.status);

    res.json({
      tournament_id: req.params.tournamentId,
      tournament_status: tournament.status,
      total_collected: paymentStats.total_collected,
      platform_total: paymentStats.platform_total,
      host_total: paymentStats.host_total,
      withdrawn: withdrawnAmount,
      available: paymentStats.host_total - withdrawnAmount,
      can_withdraw: canWithdraw,
      payment_count: paymentStats.payment_count,
      withdrawals
    });
  });

  // Request withdrawal (host only) - escrow-style: only after tournament completes
  router.post('/withdraw', requireRole('host'), (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    // Escrow check: funds only available after tournament completes
    if (!['completed', 'archived'].includes(tournament.status)) {
      return res.status(400).json({
        error: 'Funds are held in escrow until the tournament is completed'
      });
    }

    // Check if host owns this tournament
    if (tournament.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the tournament host can withdraw funds' });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required' });
    }

    // Calculate available balance
    const hostTotal = db.prepare(`
      SELECT COALESCE(SUM(host_amount), 0) as total FROM payments WHERE tournament_id = ?
    `).get(req.params.tournamentId).total;

    const withdrawn = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM host_withdrawals
      WHERE tournament_id = ? AND status = 'completed'
    `).get(req.params.tournamentId).total;

    const available = hostTotal - withdrawn;
    if (amount > available) {
      return res.status(400).json({ error: `Insufficient balance. Available: ${available}` });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO host_withdrawals (id, tournament_id, host_id, amount, status)
      VALUES (?, ?, ?, ?, 'completed')
    `).run(id, req.params.tournamentId, req.user.id, amount);

    const withdrawal = db.prepare('SELECT * FROM host_withdrawals WHERE id = ?').get(id);
    res.status(201).json(withdrawal);
  });

  return router;
}

module.exports = createPaymentRoutes;
