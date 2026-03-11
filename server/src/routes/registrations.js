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

module.exports = createRegistrationRoutes;
