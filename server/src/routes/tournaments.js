const express = require('express');
const crypto = require('crypto');
const { TOURNAMENT_STATES, canTransitionTournament } = require('../models/states');

function createTournamentRoutes(db) {
  const router = express.Router();

  // Create a tournament
  router.post('/', (req, res) => {
    const { name, type } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const tournamentType = type || 'single_elimination';
    if (!['single_elimination', 'double_elimination', 'round_robin'].includes(tournamentType)) {
      return res.status(400).json({ error: 'Invalid tournament type' });
    }

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO tournaments (id, name, type, state) VALUES (?, ?, ?, ?)').run(
      id, name, tournamentType, TOURNAMENT_STATES.REGISTRATION_OPEN
    );

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    res.status(201).json(tournament);
  });

  // Get all tournaments
  router.get('/', (req, res) => {
    const tournaments = db.prepare('SELECT * FROM tournaments').all();
    res.json(tournaments);
  });

  // Get a single tournament with its players and matches
  router.get('/:id', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const players = db.prepare(`
      SELECT p.* FROM players p
      JOIN tournament_registrations tr ON tr.player_id = p.id
      WHERE tr.tournament_id = ?
    `).all(req.params.id);

    const matches = db.prepare('SELECT * FROM matches WHERE tournament_id = ?').all(req.params.id);

    res.json({ ...tournament, players, matches });
  });

  // Update tournament state
  router.patch('/:id/state', (req, res) => {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'State is required' });
    }

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (!canTransitionTournament(tournament.state, state)) {
      return res.status(400).json({
        error: `Invalid state transition from "${tournament.state}" to "${state}"`,
      });
    }

    db.prepare('UPDATE tournaments SET state = ? WHERE id = ?').run(state, req.params.id);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Register a player to a tournament
  router.post('/:id/register', (req, res) => {
    const { player_id } = req.body;
    if (!player_id) {
      return res.status(400).json({ error: 'player_id is required' });
    }

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.state !== TOURNAMENT_STATES.REGISTRATION_OPEN) {
      return res.status(400).json({ error: 'Tournament registration is not open' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(player_id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const existing = db.prepare('SELECT * FROM tournament_registrations WHERE tournament_id = ? AND player_id = ?').get(req.params.id, player_id);
    if (existing) {
      return res.status(409).json({ error: 'Player is already registered' });
    }

    const regId = crypto.randomUUID();
    db.prepare('INSERT INTO tournament_registrations (id, tournament_id, player_id) VALUES (?, ?, ?)').run(regId, req.params.id, player_id);

    res.status(201).json({ id: regId, tournament_id: req.params.id, player_id });
  });

  // Get tournament registrations
  router.get('/:id/players', (req, res) => {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const players = db.prepare(`
      SELECT p.* FROM players p
      JOIN tournament_registrations tr ON tr.player_id = p.id
      WHERE tr.tournament_id = ?
    `).all(req.params.id);

    res.json(players);
  });

  return router;
}

module.exports = { createTournamentRoutes };
