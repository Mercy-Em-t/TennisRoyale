const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router({ mergeParams: true });

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

function getPlayer(tournamentId, playerId) {
  return db.prepare('SELECT * FROM players WHERE id = ? AND tournament_id = ?').get(playerId, tournamentId);
}

// GET /api/tournaments/:id/registrations
router.get('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const players = db.prepare('SELECT * FROM players WHERE tournament_id = ? ORDER BY registered_at ASC')
    .all(req.params.id);
  res.json(players);
});

// POST /api/tournaments/:id/registrations
router.post('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (!['registration_open'].includes(tournament.status)) {
    return res.status(409).json({ error: 'Tournament is not accepting registrations' });
  }

  const { name, email, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  // Count only accepted players to determine if new registration is late
  const accepted = db.prepare(
    `SELECT COUNT(*) as count FROM players WHERE tournament_id = ? AND status = 'accepted'`
  ).get(req.params.id);

  const isLate = accepted.count >= tournament.max_players;
  const status = isLate ? 'late' : 'pending';

  const result = db.prepare(`
    INSERT INTO players (tournament_id, name, email, phone, status) VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, name, email || null, phone || null, status);

  res.status(201).json(db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid));
});

// PATCH /api/tournaments/:id/registrations/:playerId/accept
router.patch('/:playerId/accept', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  // Preserve 'late' status for late registrants so they can be identified later
  const newStatus = player.status === 'late' ? 'late' : 'accepted';
  db.prepare(`UPDATE players SET status = ? WHERE id = ?`).run(newStatus, player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// PATCH /api/tournaments/:id/registrations/:playerId/reject
router.patch('/:playerId/reject', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare(`UPDATE players SET status = 'rejected' WHERE id = ?`).run(player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// PATCH /api/tournaments/:id/registrations/:playerId/seed
router.patch('/:playerId/seed', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const { seed } = req.body;
  if (seed !== null && seed !== undefined && (typeof seed !== 'number' || seed < 1)) {
    return res.status(400).json({ error: 'seed must be a positive integer or null' });
  }

  db.prepare('UPDATE players SET seed = ? WHERE id = ?').run(seed ?? null, player.id);
  res.json(db.prepare('SELECT * FROM players WHERE id = ?').get(player.id));
});

// DELETE /api/tournaments/:id/registrations/:playerId
router.delete('/:playerId', authenticate, (req, res) => {
  const player = getPlayer(req.params.id, req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  db.prepare('DELETE FROM players WHERE id = ?').run(player.id);
  res.status(204).send();
});

module.exports = router;
const { Router } = require('express');
const crypto = require('crypto');

function createRegistrationRoutes(db) {
  const router = Router();

  // Register a player for a tournament
  router.post('/:tournamentId/registrations', (req, res) => {
    const { tournamentId } = req.params;
    const { playerName, playerEmail } = req.body;

    if (!playerName || !playerEmail) {
      return res.status(400).json({ error: 'Player name and email are required' });
    }

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const isLateRegistration = tournament.late_registration_open === 1 && tournament.status === 'in_progress';
    if (tournament.status !== 'registration_open' && !isLateRegistration) {
      return res.status(400).json({ error: 'Registration is not open for this tournament' });
    }

    // Create or find player
    let player = db.prepare('SELECT * FROM players WHERE email = ?').get(playerEmail);
    if (!player) {
      const playerId = crypto.randomUUID();
      db.prepare('INSERT INTO players (id, name, email) VALUES (?, ?, ?)').run(playerId, playerName, playerEmail);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId);
    }

    // Check for duplicate registration
    const existing = db.prepare('SELECT * FROM registrations WHERE tournament_id = ? AND player_id = ?').get(tournamentId, player.id);
    if (existing) {
      return res.status(409).json({ error: 'Player is already registered for this tournament' });
    }

    const regId = crypto.randomUUID();
    db.prepare('INSERT INTO registrations (id, tournament_id, player_id, is_late) VALUES (?, ?, ?, ?)')
      .run(regId, tournamentId, player.id, isLateRegistration ? 1 : 0);

    const registration = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r
      JOIN players p ON r.player_id = p.id
      WHERE r.id = ?
    `).get(regId);

    res.status(201).json(registration);
  });

  // List registrations for a tournament
  router.get('/:tournamentId/registrations', (req, res) => {
    const { tournamentId } = req.params;
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

const express = require('express');
const { customAlphabet } = require('nanoid');
const { createAuditLog } = require('../models/database');

// Generate unique QR codes
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 12);

function createRouter(db) {
  const router = express.Router();

  // GET /api/registrations - List registrations (optionally filtered by tournament)
  router.get('/', (req, res) => {
    try {
      const { tournament_id, status, limit = 100, offset = 0 } = req.query;
      let sql = `
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone
        FROM registrations r
        JOIN players p ON r.player_id = p.id
      `;
      const params = [];
      const conditions = [];
      
      if (tournament_id) {
        conditions.push('r.tournament_id = ?');
        params.push(tournament_id);
      }
      
      if (status) {
        conditions.push('r.status = ?');
        params.push(status);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY r.registration_date ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const registrations = db.prepare(sql).all(...params);
      res.json(registrations);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/registrations/:id - Get a specific registration
  router.get('/:id', (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.skill_level,
               t.name as tournament_name, t.status as tournament_status
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.id = ?
      `).get(req.params.id);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/registrations - Register a player for a tournament
  router.post('/', (req, res) => {
    try {
      const { tournament_id, player_id, seed } = req.body;
      
      if (!tournament_id || !player_id) {
        return res.status(400).json({ error: 'Tournament ID and Player ID are required' });
      }

      // Check tournament exists and is open for registration
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      const isLate = tournament.status === 'in_progress';
      if (tournament.status !== 'registration_open' && !isLate) {
        return res.status(400).json({ error: 'Tournament is not open for registration' });
      }

      // Check player exists
      const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }

      // Check if already registered
      const existing = db.prepare('SELECT id FROM registrations WHERE tournament_id = ? AND player_id = ?')
        .get(tournament_id, player_id);
      if (existing) {
        return res.status(409).json({ error: 'Player is already registered for this tournament', registration_id: existing.id });
      }

      // Check max players
      const registrationCount = db.prepare('SELECT COUNT(*) as count FROM registrations WHERE tournament_id = ?')
        .get(tournament_id);
      if (registrationCount.count >= tournament.max_players) {
        return res.status(400).json({ error: 'Tournament has reached maximum capacity' });
      }

      // Generate unique QR code
      const qr_code = `TR-${tournament_id}-${nanoid()}`;

      const stmt = db.prepare(`
        INSERT INTO registrations (tournament_id, player_id, seed, is_late, qr_code, payment_amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(tournament_id, player_id, seed, isLate ? 1 : 0, qr_code, tournament.entry_fee);
      
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.id = ?
      `).get(result.lastInsertRowid);
      
      createAuditLog(db, 'registrations', registration.id, 'create', null, registration);
      
      res.status(201).json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/registrations/:id - Update a registration
  router.put('/:id', (req, res) => {
    try {
      const oldRegistration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!oldRegistration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      const { seed, status, payment_status } = req.body;
      
      const stmt = db.prepare(`
        UPDATE registrations SET
          seed = COALESCE(?, seed),
          status = COALESCE(?, status),
          payment_status = COALESCE(?, payment_status)
        WHERE id = ?
      `);
      
      stmt.run(seed, status, payment_status, req.params.id);
      
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.id = ?
      `).get(req.params.id);
      
      createAuditLog(db, 'registrations', registration.id, 'update', oldRegistration, registration);
      
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/registrations/:id - Cancel a registration
  router.delete('/:id', (req, res) => {
    try {
      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      // Check if tournament has started
      const tournament = db.prepare('SELECT status FROM tournaments WHERE id = ?').get(registration.tournament_id);
      if (tournament.status === 'in_progress' || tournament.status === 'completed') {
        // Soft delete - mark as withdrawn
        db.prepare(`UPDATE registrations SET status = 'withdrawn' WHERE id = ?`).run(req.params.id);
        
        const updated = db.prepare('SELECT * FROM registrations WHERE id = ?').get(req.params.id);
        createAuditLog(db, 'registrations', updated.id, 'update', registration, updated);
        
        return res.json({ message: 'Registration withdrawn', registration: updated });
      }

      db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'registrations', registration.id, 'delete', registration, null);
      
      res.json({ message: 'Registration cancelled', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/registrations/by-qr/:qr_code - Get registration by QR code
  router.get('/by-qr/:qr_code', (req, res) => {
    try {
      const registration = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.photo_url,
               t.name as tournament_name, t.status as tournament_status, t.location
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        JOIN tournaments t ON r.tournament_id = t.id
        WHERE r.qr_code = ?
      `).get(req.params.qr_code);
      
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json(registration);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
      ORDER BY r.created_at
    `).all(tournamentId);

    res.json(registrations);
  });

  return router;
}

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

module.exports = createRouter;
module.exports = createRegistrationRoutes;
