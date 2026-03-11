const express = require('express');
const { v4: uuidv4 } = require('uuid');

function createPoolRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // List pools for a tournament
  router.get('/', (req, res) => {
    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ? ORDER BY name').all(req.params.tournamentId);

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

    res.json(poolsWithPlayers);
  });

  // Create pool
  router.post('/', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Pool name is required' });

    const id = uuidv4();
    db.prepare('INSERT INTO pools (id, tournament_id, name) VALUES (?, ?, ?)')
      .run(id, req.params.tournamentId, name);

    const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(id);
    res.status(201).json({ ...pool, players: [] });
  });

  // Add player to pool
  router.post('/:poolId/players', (req, res) => {
    const { player_id, seed_position } = req.body;
    if (!player_id) return res.status(400).json({ error: 'Player ID is required' });

    // Remove from any existing pool in this tournament
    db.prepare(
      'DELETE FROM pool_players WHERE player_id = ? AND pool_id IN (SELECT id FROM pools WHERE tournament_id = ?)'
    ).run(player_id, req.params.tournamentId);

    const id = uuidv4();
    db.prepare('INSERT INTO pool_players (id, pool_id, player_id, seed_position) VALUES (?, ?, ?, ?)')
      .run(id, req.params.poolId, player_id, seed_position || 0);

    res.status(201).json({ message: 'Player added to pool' });
  });

  // Remove player from pool
  router.delete('/:poolId/players/:playerId', (req, res) => {
    db.prepare('DELETE FROM pool_players WHERE pool_id = ? AND player_id = ?')
      .run(req.params.poolId, req.params.playerId);
    res.json({ message: 'Player removed from pool' });
  });

  // Delete pool
  router.delete('/:poolId', (req, res) => {
    db.prepare('DELETE FROM pool_players WHERE pool_id = ?').run(req.params.poolId);
    db.prepare('DELETE FROM pools WHERE id = ?').run(req.params.poolId);
    res.json({ message: 'Pool deleted' });
  });

  return router;
}

module.exports = createPoolRoutes;
