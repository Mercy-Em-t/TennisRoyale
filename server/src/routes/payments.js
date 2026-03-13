const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Payment Routes Factory
 */
function createPaymentRoutes(db) {
  const router = express.Router();

  // GET /api/payments - List all payments with filtering
  router.get('/', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const { tournament_id, registration_id, status, limit = 100, offset = 0 } = req.query;
      let sql = `
        SELECT pay.*, r.tournament_id, p.name as player_name, p.email as player_email, t.name as tournament_name
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
      `;
      const params = [];
      const conditions = [];

      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      if (registration_id) {
        conditions.push('pay.registration_id = ?');
        params.push(registration_id);
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
      res.status(500).json({ error: 'Failed to fetch payments', message: err.message });
    }
  });

  // POST /api/payments - Record a new payment (manual or simulated)
  router.post('/', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const { registration_id, amount, payment_method, transaction_id, status = 'completed' } = req.body;
      if (!registration_id || amount === undefined) {
        return res.status(400).json({ error: 'registration_id and amount are required' });
      }

      const id = uuidv4();
      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) return res.status(404).json({ error: 'Registration not found' });

      db.prepare(`
        INSERT INTO payments (id, registration_id, amount, status)
        VALUES (?, ?, ?, ?)
      `).run(id, registration_id, amount, status);

      if (status === 'completed' || status === 'success' || status === 'paid') {
        db.prepare("UPDATE registrations SET payment_status = 'paid', payment_date = CURRENT_TIMESTAMP WHERE id = ?")
          .run(registration_id);
      }

      const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
      createAuditLog(db, 'payments', id, 'create', null, payment);

      res.status(201).json(payment);
    } catch (err) {
      res.status(500).json({ error: 'Failed to record payment', message: err.message });
    }
  });

  // GET /api/payments/:id - Details
  router.get('/:id', authenticate, (req, res) => {
    try {
      const payment = db.prepare(`
        SELECT pay.*, r.tournament_id, p.name as player_name, t.name as tournament_name
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE pay.id = ?
      `).get(req.params.id);
      if (!payment) return res.status(404).json({ error: 'Payment not found' });
      res.json(payment);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch payment', message: err.message });
    }
  });

  return router;
}

module.exports = createPaymentRoutes;
