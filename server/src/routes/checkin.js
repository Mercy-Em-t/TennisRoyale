const express = require('express');
const QRCode = require('qrcode');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // POST /api/checkin/scan - Check in a player using QR code
  router.post('/scan', (req, res) => {
    try {
      const { qr_code } = req.body;
      
      if (!qr_code) {
        return res.status(400).json({ error: 'QR code is required' });
      }

      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.photo_url,
               t.name as tournament_name, t.status as tournament_status, t.location
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.qr_code = ?
      `).get(qr_code);
      
      if (!registration) {
        return res.status(404).json({ error: 'Invalid QR code - registration not found' });
      }

      // Check tournament status
      if (registration.tournament_status === 'draft') {
        return res.status(400).json({ error: 'Tournament has not started registration yet' });
      }
      if (registration.tournament_status === 'completed' || registration.tournament_status === 'archived') {
        return res.status(400).json({ error: 'Tournament has ended' });
      }

      // Check if already checked in
      if (registration.status === 'checked_in') {
        return res.json({ 
          message: 'Already checked in',
          already_checked_in: true,
          registration 
        });
      }

      // Check payment status
      if (registration.payment_status !== 'paid' && registration.payment_status !== 'waived') {
        return res.status(400).json({ 
          error: 'Payment required before check-in',
          payment_status: registration.payment_status,
          registration 
        });
      }

      // Check waiver status
      const waivers = db.prepare(`
        SELECT * FROM waivers WHERE registration_id = ? AND signed = 0
      `).all(registration.id);
      
      if (waivers.length > 0) {
        return res.status(400).json({ 
          error: 'Unsigned waivers must be completed before check-in',
          pending_waivers: waivers,
          registration 
        });
      }

      // Perform check-in
      const oldRegistration = { ...registration };
      
      db.prepare(`
        UPDATE registrations SET status = 'checked_in', check_in_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(registration.id);

      const updatedRegistration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.photo_url,
               t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(registration.id);

      createAuditLog(db, 'registrations', registration.id, 'update', oldRegistration, updatedRegistration);

      // Broadcast check-in
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(registration.tournament_id, { type: 'player_checked_in', registration: updatedRegistration });
      }

      res.json({ 
        message: 'Check-in successful',
        registration: updatedRegistration 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/checkin/manual - Manual check-in by registration ID
  router.post('/manual', (req, res) => {
    try {
      const { registration_id, override_payment = false, override_waiver = false } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(registration_id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (registration.status === 'checked_in') {
        return res.json({ message: 'Already checked in', already_checked_in: true, registration });
      }

      // Check payment unless overridden
      if (!override_payment && registration.payment_status !== 'paid' && registration.payment_status !== 'waived') {
        return res.status(400).json({ error: 'Payment required', payment_status: registration.payment_status });
      }

      // Perform check-in
      db.prepare(`
        UPDATE registrations SET status = 'checked_in', check_in_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(registration_id);

      const updatedRegistration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.id = ?
      `).get(registration_id);

      createAuditLog(db, 'registrations', registration_id, 'update', registration, updatedRegistration);

      // Broadcast check-in
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(registration.tournament_id, { type: 'player_checked_in', registration: updatedRegistration });
      }

      res.json({ message: 'Check-in successful', registration: updatedRegistration });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/checkin/generate-qr/:registration_id - Generate QR code image
  router.get('/generate-qr/:registration_id', async (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, t.name as tournament_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(req.params.registration_id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (!registration.qr_code) {
        return res.status(400).json({ error: 'Registration does not have a QR code' });
      }

      const format = req.query.format || 'png';
      
      if (format === 'svg') {
        const svg = await QRCode.toString(registration.qr_code, { type: 'svg' });
        res.type('image/svg+xml').send(svg);
      } else if (format === 'dataurl') {
        const dataUrl = await QRCode.toDataURL(registration.qr_code, { width: 300 });
        res.json({ 
          qr_code: registration.qr_code,
          data_url: dataUrl,
          player_name: `${registration.first_name} ${registration.last_name}`,
          tournament_name: registration.tournament_name
        });
      } else {
        const buffer = await QRCode.toBuffer(registration.qr_code, { width: 300 });
        res.type('image/png').send(buffer);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/checkin/status/:tournament_id - Get check-in status for a tournament
  router.get('/status/:tournament_id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const stats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
          SUM(CASE WHEN status = 'registered' OR status = 'confirmed' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) as withdrawn,
          SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
        FROM registrations
        WHERE tournament_id = ?
      `).get(req.params.tournament_id);

      const pendingCheckIns = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ? AND r.status IN ('registered', 'confirmed')
        ORDER BY p.last_name, p.first_name
      `).all(req.params.tournament_id);

      const recentCheckIns = db.prepare(`
        SELECT r.*, p.first_name, p.last_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ? AND r.status = 'checked_in'
        ORDER BY r.check_in_time DESC
        LIMIT 10
      `).all(req.params.tournament_id);

      res.json({ 
        tournament,
        stats,
        pending_check_ins: pendingCheckIns,
        recent_check_ins: recentCheckIns
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/checkin/mark-no-show - Mark player as no-show
  router.post('/mark-no-show', (req, res) => {
    try {
      const { registration_id } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (registration.status === 'checked_in') {
        return res.status(400).json({ error: 'Cannot mark checked-in player as no-show' });
      }

      db.prepare(`UPDATE registrations SET status = 'no_show' WHERE id = ?`).run(registration_id);

      const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      
      createAuditLog(db, 'registrations', registration_id, 'update', registration, updated);

      res.json({ message: 'Player marked as no-show', registration: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/checkin/undo - Undo check-in
  router.post('/undo', (req, res) => {
    try {
      const { registration_id } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      if (registration.status !== 'checked_in') {
        return res.status(400).json({ error: 'Player is not checked in' });
      }

      db.prepare(`UPDATE registrations SET status = 'confirmed', check_in_time = NULL WHERE id = ?`).run(registration_id);

      const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      
      createAuditLog(db, 'registrations', registration_id, 'update', registration, updated);

      res.json({ message: 'Check-in undone', registration: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
