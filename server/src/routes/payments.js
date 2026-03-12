const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { calculatePlatformFee } = require('../utils/fees');

function createPaymentRouter(db) {
  const router = express.Router();

  // Shared logic for processing a successful payment
  function processPaymentSuccess(payment) {
    db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('success', payment.id);

    db.prepare(
      'UPDATE tournament_registrations SET payment_status = ? WHERE tournament_id = ? AND player_id = ?'
    ).run('paid', payment.tournament_id, payment.user_id);

    const wallet = db.prepare(
      'SELECT * FROM platform_wallet WHERE tournament_id = ?'
    ).get(payment.tournament_id);

    if (wallet) {
      db.prepare(
        `UPDATE platform_wallet SET 
          total_collected = total_collected + ?,
          platform_revenue = platform_revenue + ?,
          host_balance = host_balance + ?
        WHERE tournament_id = ?`
      ).run(payment.amount, payment.platform_fee, payment.host_amount, payment.tournament_id);
    } else {
      db.prepare(
        `INSERT INTO platform_wallet (id, tournament_id, total_collected, platform_revenue, host_balance)
         VALUES (?, ?, ?, ?, ?)`
      ).run(crypto.randomUUID(), payment.tournament_id, payment.amount, payment.platform_fee, payment.host_amount);
    }
  }

  // POST /api/payments/initiate
  router.post('/initiate', authenticate, (req, res) => {
    try {
      const { tournament_id } = req.body;

      if (!tournament_id) {
        return res.status(400).json({ error: 'tournament_id is required' });
      }

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Check registration exists
      const registration = db.prepare(
        'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND player_id = ?'
      ).get(tournament_id, req.user.id);

      if (!registration) {
        return res.status(400).json({ error: 'Must register for tournament before paying' });
      }

      if (registration.payment_status === 'paid') {
        return res.status(400).json({ error: 'Payment already completed' });
      }

      const { platform_fee, host_amount } = calculatePlatformFee(tournament.entry_fee);

      const paymentId = crypto.randomUUID();
      const transactionRef = `TXN-${Date.now()}-${paymentId.slice(0, 8)}`;

      db.prepare(
        `INSERT INTO payments (id, user_id, tournament_id, amount, platform_fee, host_amount, payment_provider, transaction_reference)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(paymentId, req.user.id, tournament_id, tournament.entry_fee, platform_fee, host_amount, 'stripe', transactionRef);

      // In production, this would redirect to Stripe/Paystack/etc.
      res.status(201).json({
        payment_id: paymentId,
        amount: tournament.entry_fee,
        platform_fee,
        host_amount,
        transaction_reference: transactionRef,
        payment_url: `/api/payments/simulate/${paymentId}`
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to initiate payment' });
    }
  });

  // POST /api/payments/webhook - Payment webhook
  router.post('/webhook', (req, res) => {
    try {
      const { transaction_reference, status } = req.body;

      if (!transaction_reference) {
        return res.status(400).json({ error: 'transaction_reference is required' });
      }

      const payment = db.prepare(
        'SELECT * FROM payments WHERE transaction_reference = ?'
      ).get(transaction_reference);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const paymentStatus = status === 'success' ? 'success' : 'failed';

      const transaction = db.transaction(() => {
        if (paymentStatus === 'success') {
          processPaymentSuccess(payment);
        } else {
          db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('failed', payment.id);
        }
      });

      transaction();

      res.json({ status: paymentStatus });
    } catch (err) {
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // POST /api/payments/simulate/:id - Simulate payment success (dev only)
  router.post('/simulate/:id', (req, res) => {
    try {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const transaction = db.transaction(() => {
        processPaymentSuccess(payment);
      });

      transaction();

      res.json({ status: 'success', message: 'Payment simulated successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Payment simulation failed' });
    }
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

module.exports = createPaymentRouter;
module.exports = createPaymentRoutes;
