const express = require('express');
const crypto = require('crypto');
const { PLAYER_STATES, canTransitionPlayer } = require('../models/states');

function createPlayerRoutes(db) {
  const router = express.Router();

  // Create a player/team
  router.post('/', (req, res) => {
    const { name, type } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const playerType = type || 'single';
    if (!['single', 'team'].includes(playerType)) {
      return res.status(400).json({ error: 'Type must be "single" or "team"' });
    }

    const id = crypto.randomUUID();
    const stmt = db.prepare('INSERT INTO players (id, name, type, status) VALUES (?, ?, ?, ?)');
    stmt.run(id, name, playerType, PLAYER_STATES.REGISTERED);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    res.status(201).json(player);
  });

  // Get all players
  router.get('/', (req, res) => {
    const players = db.prepare('SELECT * FROM players').all();
    res.json(players);
  });

  // Get a single player
  router.get('/:id', (req, res) => {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  });

  // Update player status (state transition)
  router.patch('/:id/status', (req, res) => {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!canTransitionPlayer(player.status, status)) {
      return res.status(400).json({
        error: `Invalid state transition from "${player.status}" to "${status}"`,
      });
    }

    db.prepare('UPDATE players SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Add team members (for team type players)
  router.post('/:id/members', (req, res) => {
    const { player_name } = req.body;
    if (!player_name) {
      return res.status(400).json({ error: 'player_name is required' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player/Team not found' });
    }
    if (player.type !== 'team') {
      return res.status(400).json({ error: 'Can only add members to teams' });
    }

    const memberId = crypto.randomUUID();
    db.prepare('INSERT INTO team_members (id, team_id, player_name) VALUES (?, ?, ?)').run(memberId, req.params.id, player_name);

    const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(req.params.id);
    res.status(201).json(members);
  });

  return router;
}

module.exports = { createPlayerRoutes };
