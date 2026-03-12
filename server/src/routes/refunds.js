const express = require('express');
const { authenticate } = require('../middleware/auth');

function createRefundRouter(db) {
  const router = express.Router();

  // POST /api/refunds
  router.post('/', authenticate, (req, res) => {
    try {
      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({ error: 'payment_id is required' });
      }

      const payment = db.prepare(
        'SELECT * FROM payments WHERE id = ? AND user_id = ?'
      ).get(payment_id, req.user.id);

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status !== 'success') {
        return res.status(400).json({ error: 'Only successful payments can be refunded' });
      }

      // Check tournament hasn't started
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(payment.tournament_id);
      if (tournament && (tournament.status === 'ongoing' || tournament.status === 'completed')) {
        return res.status(400).json({ error: 'Cannot refund after tournament has started' });
      }

      const transaction = db.transaction(() => {
        // Update payment status
        db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('refunded', payment.id);

        // Update registration
        db.prepare(
          'UPDATE tournament_registrations SET payment_status = ? WHERE tournament_id = ? AND player_id = ?'
        ).run('refunded', payment.tournament_id, payment.user_id);

        // Update wallet
        db.prepare(
          `UPDATE platform_wallet SET
            total_collected = total_collected - ?,
            platform_revenue = platform_revenue - ?,
            host_balance = host_balance - ?
          WHERE tournament_id = ?`
        ).run(payment.amount, payment.platform_fee, payment.host_amount, payment.tournament_id);

        // Decrement player count
        db.prepare(
          'UPDATE tournaments SET current_players = MAX(0, current_players - 1) WHERE id = ?'
        ).run(payment.tournament_id);
      });

      transaction();

      res.json({ message: 'Refund processed successfully', amount: payment.amount });
    } catch (err) {
      res.status(500).json({ error: 'Refund failed' });
    }
  });

  return router;
}

module.exports = createRefundRouter;
