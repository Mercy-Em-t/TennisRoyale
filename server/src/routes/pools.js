const express = require('express');
const db = require('../db');
const { authenticate } = require('../auth');

const router = express.Router({ mergeParams: true });

function getTournament(id) {
  return db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
}

function getPool(tournamentId, poolId) {
  return db.prepare('SELECT * FROM pools WHERE id = ? AND tournament_id = ?').get(poolId, tournamentId);
}

function getPoolWithPlayers(pool) {
  const players = db.prepare(`
    SELECT pp.id as pool_player_id, pp.position, p.*
    FROM pool_players pp
    JOIN players p ON p.id = pp.player_id
    WHERE pp.pool_id = ?
    ORDER BY pp.position ASC
  `).all(pool.id);
  return { ...pool, players };
}

// GET /api/tournaments/:id/pools
router.get('/', (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ? ORDER BY order_index ASC').all(req.params.id);
  res.json(pools.map(getPoolWithPlayers));
});

// POST /api/tournaments/:id/pools
router.post('/', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { name, order_index } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const maxOrder = db.prepare('SELECT MAX(order_index) as mx FROM pools WHERE tournament_id = ?').get(req.params.id);
  const idx = order_index !== undefined ? order_index : (maxOrder.mx ?? -1) + 1;

  const result = db.prepare('INSERT INTO pools (tournament_id, name, order_index) VALUES (?, ?, ?)')
    .run(req.params.id, name, idx);

  const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(getPoolWithPlayers(pool));
});

// PUT /api/tournaments/:id/pools/:poolId
router.put('/:poolId', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  const { name, order_index } = req.body;
  const updatedName = name !== undefined ? name : pool.name;
  const updatedOrder = order_index !== undefined ? order_index : pool.order_index;

  db.prepare('UPDATE pools SET name = ?, order_index = ? WHERE id = ?')
    .run(updatedName, updatedOrder, pool.id);

  res.json(getPoolWithPlayers(db.prepare('SELECT * FROM pools WHERE id = ?').get(pool.id)));
});

// DELETE /api/tournaments/:id/pools/:poolId
router.delete('/:poolId', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  db.prepare('DELETE FROM pools WHERE id = ?').run(pool.id);
  res.status(204).send();
});

// POST /api/tournaments/:id/pools/:poolId/players
router.post('/:poolId/players', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  const { player_id } = req.body;
  if (!player_id) return res.status(400).json({ error: 'player_id is required' });

  const player = db.prepare('SELECT * FROM players WHERE id = ? AND tournament_id = ?')
    .get(player_id, req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found in this tournament' });

  // Check player not already in another pool for this tournament
  const existing = db.prepare(`
    SELECT pp.* FROM pool_players pp
    JOIN pools po ON po.id = pp.pool_id
    WHERE pp.player_id = ? AND po.tournament_id = ?
  `).get(player_id, req.params.id);
  if (existing) {
    return res.status(409).json({ error: 'Player is already assigned to a pool in this tournament' });
  }

  const maxPos = db.prepare('SELECT MAX(position) as mx FROM pool_players WHERE pool_id = ?').get(pool.id);
  const position = (maxPos.mx ?? -1) + 1;

  db.prepare('INSERT INTO pool_players (pool_id, player_id, position) VALUES (?, ?, ?)')
    .run(pool.id, player_id, position);

  res.status(201).json(getPoolWithPlayers(db.prepare('SELECT * FROM pools WHERE id = ?').get(pool.id)));
});

// DELETE /api/tournaments/:id/pools/:poolId/players/:playerId
router.delete('/:poolId/players/:playerId', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  const entry = db.prepare('SELECT * FROM pool_players WHERE pool_id = ? AND player_id = ?')
    .get(pool.id, req.params.playerId);
  if (!entry) return res.status(404).json({ error: 'Player not in this pool' });

  db.prepare('DELETE FROM pool_players WHERE pool_id = ? AND player_id = ?')
    .run(pool.id, req.params.playerId);
  res.status(204).send();
});

// PUT /api/tournaments/:id/pools/:poolId/players/reorder
router.put('/:poolId/players/reorder', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  // Expects: { order: [playerId1, playerId2, ...] }
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of player IDs' });

  const updatePosition = db.prepare('UPDATE pool_players SET position = ? WHERE pool_id = ? AND player_id = ?');
  const reorder = db.transaction(() => {
    // Validate that all provided IDs belong to this pool
    const poolPlayerIds = new Set(
      db.prepare('SELECT player_id FROM pool_players WHERE pool_id = ?')
        .all(pool.id).map(r => r.player_id)
    );
    for (const playerId of order) {
      if (!poolPlayerIds.has(playerId)) {
        throw Object.assign(new Error(`Player ${playerId} does not belong to this pool`), { status: 400 });
      }
    }
    order.forEach((playerId, idx) => {
      updatePosition.run(idx, pool.id, playerId);
    });
  });
  try {
    reorder();
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }

  res.json(getPoolWithPlayers(db.prepare('SELECT * FROM pools WHERE id = ?').get(pool.id)));
});

// POST /api/tournaments/:id/pools/auto-assign
router.post('/auto-assign', authenticate, (req, res) => {
  const tournament = getTournament(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const { pool_size } = req.body;
  const targetPoolSize = pool_size || 4;

  // Get accepted players only (not late - late players are added manually later), seeded first
  const players = db.prepare(`
    SELECT * FROM players
    WHERE tournament_id = ? AND status = 'accepted'
    ORDER BY CASE WHEN seed IS NULL THEN 1 ELSE 0 END, seed ASC
  `).all(req.params.id);

  if (players.length === 0) {
    return res.status(400).json({ error: 'No accepted players to assign' });
  }

  // Remove existing pool assignments for this tournament
  const existingPools = db.prepare('SELECT id FROM pools WHERE tournament_id = ?').all(req.params.id);
  if (existingPools.length) {
    const poolIds = existingPools.map(p => p.id);
    db.prepare(`DELETE FROM pool_players WHERE pool_id IN (${poolIds.map(() => '?').join(',')})`).run(...poolIds);
  }
  db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(req.params.id);

  const numPools = Math.ceil(players.length / targetPoolSize);
  const pools = [];

  // Create pools
  for (let i = 0; i < numPools; i++) {
    const poolName = `Pool ${String.fromCharCode(65 + i)}`;
    const result = db.prepare('INSERT INTO pools (tournament_id, name, order_index) VALUES (?, ?, ?)')
      .run(req.params.id, poolName, i);
    pools.push({ id: result.lastInsertRowid, name: poolName });
  }

  // Distribute using snake-draft to balance seeded players
  const insertPoolPlayer = db.prepare('INSERT INTO pool_players (pool_id, player_id, position) VALUES (?, ?, ?)');
  const assign = db.transaction(() => {
    players.forEach((player, idx) => {
      // Snake draft: 0,1,2,...,n-1,n-1,...,1,0,0,1,...
      const round = Math.floor(idx / numPools);
      const posInRound = idx % numPools;
      const poolIndex = round % 2 === 0 ? posInRound : numPools - 1 - posInRound;
      const pool = pools[poolIndex];
      const position = db.prepare('SELECT COUNT(*) as cnt FROM pool_players WHERE pool_id = ?').get(pool.id).cnt;
      insertPoolPlayer.run(pool.id, player.id, position);
    });
  });
  assign();

  const updatedPools = db.prepare('SELECT * FROM pools WHERE tournament_id = ? ORDER BY order_index ASC').all(req.params.id);
  res.json(updatedPools.map(getPoolWithPlayers));
});

// POST /api/tournaments/:id/pools/:poolId/generate-matches
router.post('/:poolId/generate-matches', authenticate, (req, res) => {
  const pool = getPool(req.params.id, req.params.poolId);
  if (!pool) return res.status(404).json({ error: 'Pool not found' });

  const players = db.prepare(`
    SELECT p.* FROM pool_players pp
    JOIN players p ON p.id = pp.player_id
    WHERE pp.pool_id = ?
    ORDER BY pp.position ASC
  `).all(pool.id);

  if (players.length < 2) {
    return res.status(400).json({ error: 'Pool needs at least 2 players to generate matches' });
  }

  // Remove existing non-late matches for this pool
  db.prepare('DELETE FROM matches WHERE pool_id = ? AND is_late_registration = 0').run(pool.id);

  const matches = [];
  const insertMatch = db.prepare(`
    INSERT INTO matches (tournament_id, pool_id, player1_id, player2_id, round, match_number, status)
    VALUES (?, ?, ?, ?, 1, ?, 'scheduled')
  `);

  let matchNumber = 1;
  const generate = db.transaction(() => {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const result = insertMatch.run(req.params.id, pool.id, players[i].id, players[j].id, matchNumber++);
        matches.push(db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid));
      }
    }
  });
  generate();

  res.status(201).json(matches);
});

module.exports = router;
