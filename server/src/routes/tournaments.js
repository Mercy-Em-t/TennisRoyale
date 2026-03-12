const { Router } = require('express');
const crypto = require('crypto');

function createTournamentRoutes(db) {
  const router = Router();

  // Create tournament
  router.post('/', (req, res) => {
    const { name, date, location, max_participants, fee, poster_url, certificate_enabled } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }
    const id = crypto.randomUUID();
    db.prepare(`INSERT INTO tournaments (id, name, date, location, max_participants, fee, poster_url, certificate_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, name, date || null, location || null, max_participants || null,
      fee || 0, poster_url || null, certificate_enabled ? 1 : 0
    );
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    res.status(201).json(tournament);
  });

  // List tournaments
  router.get('/', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments WHERE archived = 0 ORDER BY created_at DESC').all();
    res.json(tournaments);
  });

  // Get tournament by ID
  router.get('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  });

  // Open registration
  router.patch('/:id/open-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'draft') {
      return res.status(400).json({ error: 'Can only open registration from draft status' });
    }
    db.prepare("UPDATE tournaments SET status = 'registration_open', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close registration
  router.patch('/:id/close-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'registration_open') {
      return res.status(400).json({ error: 'Registration is not currently open' });
    }
    db.prepare("UPDATE tournaments SET status = 'registration_closed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Open late registration
  router.patch('/:id/open-late-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Late registration can only be opened when tournament is in progress' });
    }
    db.prepare("UPDATE tournaments SET late_registration_open = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close late registration
  router.patch('/:id/close-late-registration', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    db.prepare("UPDATE tournaments SET late_registration_open = 0, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Close tournament
  router.patch('/:id/close', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Can only close a tournament that is in progress' });
    }
    // Check all matches are completed
    const pendingMatches = db.prepare("SELECT COUNT(*) as count FROM matches WHERE tournament_id = ? AND status != 'completed'").get(req.params.id);
    if (pendingMatches.count > 0) {
      return res.status(400).json({ error: `Cannot close tournament: ${pendingMatches.count} matches are still pending` });
    }
    db.prepare("UPDATE tournaments SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Export tournament data
  router.get('/:id/export', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const registrations = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r
      JOIN players p ON r.player_id = p.id
      WHERE r.tournament_id = ?
    `).all(req.params.id);

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(req.params.id);
    const poolsWithPlayers = pools.map(pool => {
      const players = db.prepare(`
        SELECT pp.*, p.name as player_name, p.email as player_email
        FROM pool_players pp
        JOIN players p ON pp.player_id = p.id
        WHERE pp.pool_id = ?
        ORDER BY pp.seed_position
      `).all(pool.id);
      return { ...pool, players };
    });

    const matches = db.prepare(`
      SELECT m.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round, m.bracket_stage
    `).all(req.params.id);

    const staff = db.prepare('SELECT * FROM tournament_staff WHERE tournament_id = ?').all(req.params.id);
    const reviews = db.prepare('SELECT * FROM tournament_reviews WHERE tournament_id = ? ORDER BY created_at DESC').all(req.params.id);
    const messages = db.prepare(`
      SELECT m.*, p.name as recipient_name
      FROM tournament_messages m
      LEFT JOIN players p ON m.recipient_player_id = p.id
      WHERE m.tournament_id = ?
      ORDER BY m.created_at DESC
    `).all(req.params.id);

    res.json({
      tournament,
      registrations,
      pools: poolsWithPlayers,
      matches,
      staff,
      reviews,
      messages
    });
  });

  // Archive tournament
  router.post('/:id/archive', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'completed') {
      return res.status(400).json({ error: 'Can only archive a completed tournament' });
    }
    db.prepare("UPDATE tournaments SET archived = 1, updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Update tournament details
  router.patch('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const { name, date, location, max_participants, fee, poster_url, certificate_enabled } = req.body;
    db.prepare(`UPDATE tournaments SET
      name = COALESCE(?, name),
      date = COALESCE(?, date),
      location = COALESCE(?, location),
      max_participants = COALESCE(?, max_participants),
      fee = COALESCE(?, fee),
      poster_url = COALESCE(?, poster_url),
      certificate_enabled = COALESCE(?, certificate_enabled),
      updated_at = datetime('now')
      WHERE id = ?`).run(
      name || null, date !== undefined ? date : null, location !== undefined ? location : null,
      max_participants !== undefined ? max_participants : null,
      fee !== undefined ? fee : null, poster_url !== undefined ? poster_url : null,
      certificate_enabled !== undefined ? (certificate_enabled ? 1 : 0) : null,
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // --- Staff Management ---
  router.post('/:id/staff', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const { name, role, email } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }
    if (!['referee', 'court_marshal'].includes(role)) {
      return res.status(400).json({ error: 'Role must be referee or court_marshal' });
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO tournament_staff (id, tournament_id, name, role, email) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, name, role, email || null);
    const staff = db.prepare('SELECT * FROM tournament_staff WHERE id = ?').get(id);
    res.status(201).json(staff);
  });

  router.get('/:id/staff', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const staff = db.prepare('SELECT * FROM tournament_staff WHERE tournament_id = ? ORDER BY role, name').all(req.params.id);
    res.json(staff);
  });

  router.delete('/:id/staff/:staffId', (req, res) => {
    const staff = db.prepare('SELECT * FROM tournament_staff WHERE id = ? AND tournament_id = ?').get(req.params.staffId, req.params.id);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    db.prepare('DELETE FROM tournament_staff WHERE id = ?').run(req.params.staffId);
    res.json({ message: 'Staff member removed' });
  });

  // --- Reviews / Comments ---
  router.post('/:id/reviews', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const { author, comment, rating } = req.body;
    if (!author || !comment) {
      return res.status(400).json({ error: 'Author and comment are required' });
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO tournament_reviews (id, tournament_id, author, comment, rating) VALUES (?, ?, ?, ?, ?)').run(id, req.params.id, author, comment, rating || null);
    const review = db.prepare('SELECT * FROM tournament_reviews WHERE id = ?').get(id);
    res.status(201).json(review);
  });

  router.get('/:id/reviews', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const reviews = db.prepare('SELECT * FROM tournament_reviews WHERE tournament_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(reviews);
  });

  // --- Messages ---
  router.post('/:id/messages', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const { subject, body, recipientPlayerId, isBroadcast } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }
    if (!isBroadcast && !recipientPlayerId) {
      return res.status(400).json({ error: 'Either recipientPlayerId or isBroadcast is required' });
    }
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO tournament_messages (id, tournament_id, recipient_player_id, subject, body, is_broadcast) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.params.id, isBroadcast ? null : recipientPlayerId, subject, body, isBroadcast ? 1 : 0
    );
    const message = db.prepare('SELECT * FROM tournament_messages WHERE id = ?').get(id);
    res.status(201).json(message);
  });

  router.get('/:id/messages', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    const messages = db.prepare(`
      SELECT m.*, p.name as recipient_name
      FROM tournament_messages m
      LEFT JOIN players p ON m.recipient_player_id = p.id
      WHERE m.tournament_id = ?
      ORDER BY m.created_at DESC
    `).all(req.params.id);
    res.json(messages);
  });

  // --- PDF Export ---
  router.get('/:id/export/pdf', (req, res) => {
    const PDFDocument = require('pdfkit');
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const registrations = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r JOIN players p ON r.player_id = p.id
      WHERE r.tournament_id = ?
    `).all(req.params.id);

    const matches = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round, m.bracket_stage
    `).all(req.params.id);

    const staff = db.prepare('SELECT * FROM tournament_staff WHERE tournament_id = ?').all(req.params.id);

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="tournament-${req.params.id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).text(tournament.name, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#666');
    if (tournament.date) doc.text(`Date: ${tournament.date}`, { align: 'center' });
    if (tournament.location) doc.text(`Location: ${tournament.location}`, { align: 'center' });
    doc.text(`Status: ${tournament.status}`, { align: 'center' });
    if (tournament.fee) doc.text(`Fee: $${tournament.fee}`, { align: 'center' });
    doc.moveDown();

    if (staff.length > 0) {
      doc.fontSize(14).fillColor('#000').text('Staff');
      doc.moveDown(0.3);
      staff.forEach(s => {
        doc.fontSize(10).fillColor('#333').text(`${s.role === 'referee' ? 'Referee' : 'Court Marshal'}: ${s.name}${s.email ? ' (' + s.email + ')' : ''}`);
      });
      doc.moveDown();
    }

    doc.fontSize(14).fillColor('#000').text('Registered Players');
    doc.moveDown(0.3);
    registrations.forEach((r, i) => {
      doc.fontSize(10).fillColor('#333').text(`${i + 1}. ${r.player_name} (${r.player_email})${r.is_late ? ' [Late]' : ''}`);
    });
    doc.moveDown();

    doc.fontSize(14).fillColor('#000').text('Matches');
    doc.moveDown(0.3);
    matches.forEach(m => {
      const score = m.score_player1 != null ? `  ${m.score_player1}-${m.score_player2}` : '';
      const winner = m.winner_name ? `  Winner: ${m.winner_name}` : '';
      doc.fontSize(10).fillColor('#333').text(
        `[${m.bracket_stage}] ${m.player1_name || '?'} vs ${m.player2_name || '?'}${score}${winner}  (${m.status})`
      );
    });

    doc.end();
  });

  // --- Excel Export ---
  router.get('/:id/export/excel', async (req, res) => {
    const ExcelJS = require('exceljs');
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const registrations = db.prepare(`
      SELECT r.*, p.name as player_name, p.email as player_email
      FROM registrations r JOIN players p ON r.player_id = p.id
      WHERE r.tournament_id = ?
    `).all(req.params.id);

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(req.params.id);
    const poolsWithPlayers = pools.map(pool => {
      const players = db.prepare(`
        SELECT pp.*, p.name as player_name, p.email as player_email
        FROM pool_players pp JOIN players p ON pp.player_id = p.id
        WHERE pp.pool_id = ? ORDER BY pp.seed_position
      `).all(pool.id);
      return { ...pool, players };
    });

    const matches = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.round, m.bracket_stage
    `).all(req.params.id);

    const staff = db.prepare('SELECT * FROM tournament_staff WHERE tournament_id = ?').all(req.params.id);

    const workbook = new ExcelJS.Workbook();

    // Tournament Info sheet
    const infoSheet = workbook.addWorksheet('Tournament Info');
    infoSheet.columns = [{ header: 'Field', key: 'field', width: 20 }, { header: 'Value', key: 'value', width: 40 }];
    infoSheet.addRow({ field: 'Name', value: tournament.name });
    infoSheet.addRow({ field: 'Date', value: tournament.date || '' });
    infoSheet.addRow({ field: 'Location', value: tournament.location || '' });
    infoSheet.addRow({ field: 'Status', value: tournament.status });
    infoSheet.addRow({ field: 'Fee', value: tournament.fee || 0 });
    infoSheet.addRow({ field: 'Max Participants', value: tournament.max_participants || '' });
    infoSheet.addRow({ field: 'Certificate Enabled', value: tournament.certificate_enabled ? 'Yes' : 'No' });

    // Staff sheet
    if (staff.length > 0) {
      const staffSheet = workbook.addWorksheet('Staff');
      staffSheet.columns = [
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Role', key: 'role', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
      ];
      staff.forEach(s => staffSheet.addRow({ name: s.name, role: s.role, email: s.email || '' }));
    }

    // Players sheet
    const playersSheet = workbook.addWorksheet('Registered Players');
    playersSheet.columns = [
      { header: '#', key: 'num', width: 5 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Late Registration', key: 'late', width: 18 },
    ];
    registrations.forEach((r, i) => {
      playersSheet.addRow({ num: i + 1, name: r.player_name, email: r.player_email, late: r.is_late ? 'Yes' : 'No' });
    });

    // Pools sheet
    if (poolsWithPlayers.length > 0) {
      const poolSheet = workbook.addWorksheet('Pools');
      poolSheet.columns = [
        { header: 'Pool', key: 'pool', width: 15 },
        { header: 'Seed', key: 'seed', width: 8 },
        { header: 'Player', key: 'player', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
      ];
      poolsWithPlayers.forEach(pool => {
        pool.players.forEach(p => {
          poolSheet.addRow({ pool: pool.name, seed: p.seed_position, player: p.player_name, email: p.player_email });
        });
      });
    }

    // Matches sheet
    const matchSheet = workbook.addWorksheet('Matches');
    matchSheet.columns = [
      { header: 'Stage', key: 'stage', width: 15 },
      { header: 'Round', key: 'round', width: 8 },
      { header: 'Player 1', key: 'p1', width: 20 },
      { header: 'Player 2', key: 'p2', width: 20 },
      { header: 'Score', key: 'score', width: 12 },
      { header: 'Winner', key: 'winner', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Scheduled', key: 'scheduled', width: 20 },
    ];
    matches.forEach(m => {
      matchSheet.addRow({
        stage: m.bracket_stage, round: m.round,
        p1: m.player1_name || '', p2: m.player2_name || '',
        score: m.score_player1 != null ? `${m.score_player1}-${m.score_player2}` : '',
        winner: m.winner_name || '', status: m.status,
        scheduled: m.scheduled_at || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tournament-${req.params.id}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
const express = require('express');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');

function createTournamentRouter(db) {
  const router = express.Router();

  // GET /api/tournaments - Browse tournaments (public, only published)
  router.get('/', (req, res) => {
    try {
      const { sport, location, date } = req.query;
      let query = 'SELECT t.*, u.name as host_name FROM tournaments t JOIN users u ON t.host_id = u.id WHERE t.status = ?';
      const params = ['published'];

      if (sport) {
        query += ' AND t.sport = ?';
        params.push(sport);
      }
      if (location) {
        query += ' AND t.location LIKE ?';
        params.push(`%${location}%`);
      }
      if (date) {
        query += ' AND t.start_date >= ?';
        params.push(date);
      }

      query += ' ORDER BY t.start_date ASC';

      const tournaments = db.prepare(query).all(...params);
      res.json({ tournaments });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournaments' });
    }
  });

  // GET /api/tournaments/:id - Tournament details
  router.get('/:id', (req, res) => {
    try {
      const tournament = db.prepare(
        'SELECT t.*, u.name as host_name FROM tournaments t JOIN users u ON t.host_id = u.id WHERE t.id = ?'
      ).get(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      res.json({ tournament });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tournament' });
    }
  });

  // POST /api/tournaments - Create tournament (host only)
  router.post('/', authenticate, requireRole('host'), (req, res) => {
    try {
      const { title, description, sport, location, entry_fee, max_players, registration_deadline, start_date, end_date } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO tournaments (id, host_id, title, description, sport, location, entry_fee, max_players, registration_deadline, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, req.user.id, title, description || null, sport || 'tennis', location || null, entry_fee || 0, max_players || 32, registration_deadline || null, start_date || null, end_date || null);

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
      res.status(201).json({ tournament });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  });

  // POST /api/tournaments/:id/publish - Publish tournament
  router.post('/:id/publish', authenticate, requireRole('host'), (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ? AND host_id = ?').get(req.params.id, req.user.id);

const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/tournaments - List all tournaments
  router.get('/', (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      let sql = 'SELECT * FROM tournaments';
      const params = [];
      
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const tournaments = db.prepare(sql).all(...params);
      res.json(tournaments);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id - Get a specific tournament
  router.get('/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments - Create a new tournament
  router.post('/', (req, res) => {
    try {
      const { name, description, location, start_date, end_date, max_players, entry_fee } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Tournament name is required' });
      }

      const stmt = db.prepare(`
        INSERT INTO tournaments (name, description, location, start_date, end_date, max_players, entry_fee)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(name, description, location, start_date, end_date, max_players || 32, entry_fee || 0);
      
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'tournaments', tournament.id, 'create', null, tournament);
      
      res.status(201).json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/tournaments/:id - Update a tournament
  router.put('/:id', (req, res) => {
    try {
      const oldTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!oldTournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const { name, description, location, start_date, end_date, max_players, entry_fee } = req.body;
      
      const stmt = db.prepare(`
        UPDATE tournaments SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          max_players = COALESCE(?, max_players),
          entry_fee = COALESCE(?, entry_fee),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(name, description, location, start_date, end_date, max_players, entry_fee, req.params.id);
      
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', tournament.id, 'update', oldTournament, tournament);
      
      res.json(tournament);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/tournaments/:id - Delete a tournament
  router.delete('/:id', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Only draft tournaments can be published' });
      }

      db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('published', req.params.id);

      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      res.json({ tournament: updated, registration_link: `/tournaments/${req.params.id}/register` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to publish tournament' });
    }
  });

  // POST /api/tournaments/:id/register - Register for tournament
  router.post('/:id/register', authenticate, (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'published') {
        return res.status(400).json({ error: 'Tournament is not open for registration' });
      }

      // Check registration deadline
      if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }

      // Check slots
      if (tournament.current_players >= tournament.max_players) {
        return res.status(400).json({ error: 'Tournament is full' });
      }

      // Check duplicate
      const existing = db.prepare(
        'SELECT id FROM tournament_registrations WHERE tournament_id = ? AND player_id = ?'
      ).get(req.params.id, req.user.id);

      if (existing) {
        return res.status(409).json({ error: 'Already registered for this tournament' });
      }

      const regId = crypto.randomUUID();

      const transaction = db.transaction(() => {
        db.prepare(
          'INSERT INTO tournament_registrations (id, tournament_id, player_id) VALUES (?, ?, ?)'
        ).run(regId, req.params.id, req.user.id);

        db.prepare(
          'UPDATE tournaments SET current_players = current_players + 1 WHERE id = ?'
        ).run(req.params.id);
      });

      transaction();

      const registration = db.prepare('SELECT * FROM tournament_registrations WHERE id = ?').get(regId);
      res.status(201).json({ registration });
    } catch (err) {
      res.status(500).json({ error: 'Failed to register for tournament' });
      db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'tournaments', tournament.id, 'delete', tournament, null);
      
      res.json({ message: 'Tournament deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/open-registration - Open registration for a tournament
  router.post('/:id/open-registration', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'draft') {
        return res.status(400).json({ error: 'Can only open registration for draft tournaments' });
      }

      db.prepare(`UPDATE tournaments SET status = 'registration_open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/close-registration - Close registration
  router.post('/:id/close-registration', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'registration_open') {
        return res.status(400).json({ error: 'Can only close registration for tournaments with open registration' });
      }

      db.prepare(`UPDATE tournaments SET status = 'registration_closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/start - Start the tournament
  router.post('/:id/start', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'registration_closed') {
        return res.status(400).json({ error: 'Can only start tournaments with closed registration' });
      }

      db.prepare(`UPDATE tournaments SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      // Broadcast to WebSocket clients
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(parseInt(req.params.id), { type: 'tournament_started', tournament: updated });
      }
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/complete - Complete the tournament
  router.post('/:id/complete', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'in_progress') {
        return res.status(400).json({ error: 'Can only complete tournaments that are in progress' });
      }

      db.prepare(`UPDATE tournaments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      // Broadcast to WebSocket clients
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(parseInt(req.params.id), { type: 'tournament_completed', tournament: updated });
      }
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/tournaments/:id/archive - Archive the tournament
  router.post('/:id/archive', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      if (tournament.status !== 'completed' && tournament.status !== 'cancelled') {
        return res.status(400).json({ error: 'Can only archive completed or cancelled tournaments' });
      }

      db.prepare(`UPDATE tournaments SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(req.params.id);
      
      const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'tournaments', updated.id, 'update', tournament, updated);
      
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/standings - Get tournament standings
  router.get('/:id/standings', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const standings = db.prepare(`
        SELECT 
          p.id as player_id,
          p.first_name,
          p.last_name,
          r.id as registration_id,
          r.seed,
          pp.wins,
          pp.losses,
          pp.games_won,
          pp.games_lost,
          pp.points_won,
          pp.points_lost,
          po.name as pool_name
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        LEFT JOIN pool_players pp ON r.id = pp.registration_id
        LEFT JOIN pools po ON pp.pool_id = po.id
        WHERE r.tournament_id = ?
        ORDER BY pp.wins DESC, (pp.games_won - pp.games_lost) DESC, pp.points_won DESC
      `).all(req.params.id);

      res.json({ tournament, standings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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

    db.prepare('DELETE FROM host_withdrawals WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM payments WHERE tournament_id = ?').run(req.params.id);
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
module.exports = createTournamentRouter;

module.exports = createRouter;
module.exports = createTournamentRoutes;
