const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { calculatePlatformFee } = require('../utils/fees');

function createPaymentRouter(db) {
  const router = express.Router();

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
        // Update payment status
        db.prepare('UPDATE payments SET status = ? WHERE id = ?').run(paymentStatus, payment.id);

        if (paymentStatus === 'success') {
          // Update registration
          db.prepare(
            'UPDATE tournament_registrations SET payment_status = ? WHERE tournament_id = ? AND player_id = ?'
          ).run('paid', payment.tournament_id, payment.user_id);

          // Update or create wallet entry
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

      // Simulate webhook call
      const transaction = db.transaction(() => {
        db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('success', payment.id);

        db.prepare(
          'UPDATE tournament_registrations SET payment_status = ? WHERE tournament_id = ? AND player_id = ?'
        ).run('paid', payment.tournament_id, payment.user_id);

        const wallet = db.prepare('SELECT * FROM platform_wallet WHERE tournament_id = ?').get(payment.tournament_id);

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
      });

      transaction();

      res.json({ status: 'success', message: 'Payment simulated successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Payment simulation failed' });
    }
  });

  return router;
}

module.exports = createPaymentRouter;
