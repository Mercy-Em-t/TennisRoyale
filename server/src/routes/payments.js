const express = require('express');
const { customAlphabet } = require('nanoid');
const { createAuditLog } = require('../models/database');

// Generate receipt numbers
const generateReceiptNumber = customAlphabet('0123456789', 10);

function createRouter(db) {
  const router = express.Router();

  // GET /api/payments - List payments with filters
  router.get('/', (req, res) => {
    try {
      const { registration_id, tournament_id, status, limit = 100, offset = 0 } = req.query;
      
      let sql = `
        SELECT pay.*, r.tournament_id, p.first_name, p.last_name, p.email,
               t.name as tournament_name
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
      `;
      const params = [];
      const conditions = [];
      
      if (registration_id) {
        conditions.push('pay.registration_id = ?');
        params.push(registration_id);
      }
      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      if (status) {
        conditions.push('pay.status = ?');
        params.push(status);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY pay.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const payments = db.prepare(sql).all(...params);
      res.json(payments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/payments/:id - Get a specific payment
  router.get('/:id', (req, res) => {
    try {
      const payment = db.prepare(`
        SELECT pay.*, r.tournament_id, p.first_name, p.last_name, p.email,
               t.name as tournament_name, t.entry_fee
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE pay.id = ?
      `).get(req.params.id);
      
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      res.json(payment);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/payments - Record a payment
  router.post('/', (req, res) => {
    try {
      const { registration_id, amount, payment_method, transaction_id, notes, processed_by } = req.body;
      
      if (!registration_id || amount === undefined) {
        return res.status(400).json({ error: 'Registration ID and amount are required' });
      }

      const registration = db.prepare(`
        SELECT r.*, t.entry_fee, t.name as tournament_name
        FROM registrations r
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(registration_id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      const receipt_number = `RCP-${generateReceiptNumber()}`;

      const stmt = db.prepare(`
        INSERT INTO payments (registration_id, amount, currency, payment_method, transaction_id, status, receipt_number, notes, processed_by)
        VALUES (?, ?, 'KES', ?, ?, 'completed', ?, ?, ?)
      `);
      
      const result = stmt.run(registration_id, amount, payment_method, transaction_id, receipt_number, notes, processed_by);
      
      // Update registration payment status
      db.prepare(`
        UPDATE registrations SET payment_status = 'paid', payment_amount = ?, payment_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(amount, registration_id);

      const payment = db.prepare(`
        SELECT pay.*, p.first_name, p.last_name, p.email
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE pay.id = ?
      `).get(result.lastInsertRowid);
      
      createAuditLog(db, 'payments', payment.id, 'create', null, payment);
      
      res.status(201).json(payment);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/payments/:id/refund - Refund a payment
  router.post('/:id/refund', (req, res) => {
    try {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (payment.status === 'refunded') {
        return res.status(400).json({ error: 'Payment has already been refunded' });
      }

      const { refund_amount, reason, processed_by } = req.body;
      const actualRefundAmount = refund_amount || payment.amount;

      // Update payment status
      db.prepare(`
        UPDATE payments SET status = 'refunded', notes = COALESCE(notes, '') || ' | Refund: ' || ?
        WHERE id = ?
      `).run(reason || 'No reason provided', req.params.id);

      // Create refund record
      const receipt_number = `REF-${generateReceiptNumber()}`;
      const refundResult = db.prepare(`
        INSERT INTO payments (registration_id, amount, currency, payment_method, status, receipt_number, notes, processed_by)
        VALUES (?, ?, 'KES', 'refund', 'completed', ?, ?, ?)
      `).run(payment.registration_id, -actualRefundAmount, receipt_number, `Refund for payment ${payment.id}: ${reason || 'N/A'}`, processed_by);

      // Update registration payment status
      db.prepare(`
        UPDATE registrations SET payment_status = 'refunded'
        WHERE id = ?
      `).run(payment.registration_id);

      const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
      const refund = db.prepare('SELECT * FROM payments WHERE id = ?').get(refundResult.lastInsertRowid);
      
      createAuditLog(db, 'payments', payment.id, 'update', payment, updatedPayment);
      createAuditLog(db, 'payments', refund.id, 'create', null, refund);

      res.json({ 
        message: 'Refund processed',
        original_payment: updatedPayment,
        refund 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/payments/waive - Waive payment for a registration
  router.post('/waive', (req, res) => {
    try {
      const { registration_id, reason, processed_by } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (registration.payment_status === 'paid') {
        return res.status(400).json({ error: 'Registration is already paid' });
      }

      // Create waived payment record
      const receipt_number = `WVD-${generateReceiptNumber()}`;
      const result = db.prepare(`
        INSERT INTO payments (registration_id, amount, currency, payment_method, status, receipt_number, notes, processed_by)
        VALUES (?, 0, 'KES', 'waived', 'completed', ?, ?, ?)
      `).run(registration_id, receipt_number, `Payment waived: ${reason || 'No reason provided'}`, processed_by);

      // Update registration
      db.prepare(`
        UPDATE registrations SET payment_status = 'waived', payment_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(registration_id);

      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
      const updatedRegistration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);

      createAuditLog(db, 'payments', payment.id, 'create', null, payment);
      createAuditLog(db, 'registrations', registration_id, 'update', registration, updatedRegistration);

      res.status(201).json({ 
        message: 'Payment waived',
        payment,
        registration: updatedRegistration 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/payments/tournament/:tournament_id/summary - Get payment summary for tournament
  router.get('/tournament/:tournament_id/summary', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const summary = db.prepare(`
        SELECT 
          COUNT(DISTINCT r.id) as total_registrations,
          SUM(CASE WHEN r.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
          SUM(CASE WHEN r.payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN r.payment_status = 'waived' THEN 1 ELSE 0 END) as waived_count,
          SUM(CASE WHEN r.payment_status = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
          COALESCE(SUM(CASE WHEN pay.status = 'completed' AND pay.amount > 0 THEN pay.amount ELSE 0 END), 0) as total_collected,
          COALESCE(SUM(CASE WHEN pay.status = 'completed' AND pay.amount < 0 THEN ABS(pay.amount) ELSE 0 END), 0) as total_refunded
        FROM registrations r
        LEFT JOIN payments pay ON r.id = pay.registration_id
        WHERE r.tournament_id = ?
      `).get(req.params.tournament_id);

      const pendingPayments = db.prepare(`
        SELECT r.id as registration_id, p.first_name, p.last_name, p.email, r.payment_amount
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ? AND r.payment_status = 'pending'
      `).all(req.params.tournament_id);

      res.json({ 
        tournament,
        summary: {
          ...summary,
          net_collected: summary.total_collected - summary.total_refunded
        },
        pending_payments: pendingPayments
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/payments/:id/receipt - Get receipt for a payment
  router.get('/:id/receipt', (req, res) => {
    try {
      const payment = db.prepare(`
        SELECT pay.*, r.tournament_id, r.registration_date,
               p.first_name, p.last_name, p.email, p.phone,
               t.name as tournament_name, t.location as tournament_location, t.entry_fee
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE pay.id = ?
      `).get(req.params.id);
      
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      const receipt = {
        receipt_number: payment.receipt_number,
        date: payment.created_at,
        tournament: {
          name: payment.tournament_name,
          location: payment.tournament_location
        },
        player: {
          name: `${payment.first_name} ${payment.last_name}`,
          email: payment.email,
          phone: payment.phone
        },
        payment: {
          amount: payment.amount,
          currency: payment.currency,
          method: payment.payment_method,
          transaction_id: payment.transaction_id,
          status: payment.status
        },
        notes: payment.notes
      };

      res.json(receipt);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
