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
  });

  return router;
}

module.exports = createTournamentRoutes;
