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
    const { clause, values } = db.buildInClause(poolIds);
    db.prepare(`DELETE FROM pool_players WHERE pool_id ${clause}`).run(...values);
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
const { Router } = require('express');
const crypto = require('crypto');

function createPoolRoutes(db) {
  const router = Router();

  // Create pools for a tournament
  router.post('/:tournamentId/pools', (req, res) => {
    const { tournamentId } = req.params;
    const { pools } = req.body; // [{ name: 'Pool A', players: [{ playerId, seedPosition }] }]

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'registration_closed' && tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Pools can only be created after registration is closed' });
    }

    if (!pools || !Array.isArray(pools) || pools.length === 0) {
      return res.status(400).json({ error: 'At least one pool is required' });
    }

    const createPool = db.transaction(() => {
      // Remove existing pools if recreating
      const existingPools = db.prepare('SELECT id FROM pools WHERE tournament_id = ?').all(tournamentId);
      for (const ep of existingPools) {
        db.prepare('DELETE FROM pool_players WHERE pool_id = ?').run(ep.id);
      }
      db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(tournamentId);

      const createdPools = [];
      for (const pool of pools) {
        const poolId = crypto.randomUUID();
        db.prepare('INSERT INTO pools (id, tournament_id, name) VALUES (?, ?, ?)').run(poolId, tournamentId, pool.name);

        if (pool.players && Array.isArray(pool.players)) {
          for (const player of pool.players) {
            const ppId = crypto.randomUUID();
            db.prepare('INSERT INTO pool_players (id, pool_id, player_id, seed_position) VALUES (?, ?, ?, ?)')
              .run(ppId, poolId, player.playerId, player.seedPosition || 0);
          }
        }

        const poolPlayers = db.prepare(`
          SELECT pp.*, p.name as player_name, p.email as player_email
          FROM pool_players pp
          JOIN players p ON pp.player_id = p.id
          WHERE pp.pool_id = ?
          ORDER BY pp.seed_position
        `).all(poolId);

        createdPools.push({
          id: poolId,
          tournament_id: tournamentId,
          name: pool.name,
          players: poolPlayers
        });
      }
      return createdPools;
    });

    const result = createPool();
    res.status(201).json(result);
  });

  // Get pools for a tournament
  router.get('/:tournamentId/pools', (req, res) => {
    const { tournamentId } = req.params;
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(tournamentId);
    const result = pools.map(pool => {
const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/pools - List all pools (optionally filtered by tournament)
  router.get('/', (req, res) => {
    try {
      const { tournament_id } = req.query;
      let sql = 'SELECT * FROM pools';
      const params = [];
      
      if (tournament_id) {
        sql += ' WHERE tournament_id = ?';
        params.push(tournament_id);
      }
      
      sql += ' ORDER BY pool_order ASC';
      
      const pools = db.prepare(sql).all(...params);
      res.json(pools);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/pools/:id - Get a specific pool with players
  router.get('/:id', (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      // Get players in this pool
      const players = db.prepare(`
        SELECT pp.*, r.id as registration_id, p.first_name, p.last_name, p.email
        FROM pool_players pp
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE pp.pool_id = ?
        ORDER BY pp.seed_in_pool ASC
      `).all(req.params.id);

      res.json({ ...pool, players });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/pools - Create a new pool
  router.post('/', (req, res) => {
    try {
      const { tournament_id, name, pool_order } = req.body;
      
      if (!tournament_id || !name) {
        return res.status(400).json({ error: 'Tournament ID and pool name are required' });
      }

      // Check tournament exists
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const stmt = db.prepare(`
        INSERT INTO pools (tournament_id, name, pool_order)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(tournament_id, name, pool_order || 0);
      
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'pools', pool.id, 'create', null, pool);
      
      res.status(201).json(pool);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/pools/:id - Update a pool
  router.put('/:id', (req, res) => {
    try {
      const oldPool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!oldPool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      const { name, pool_order } = req.body;
      
      const stmt = db.prepare(`
        UPDATE pools SET
          name = COALESCE(?, name),
          pool_order = COALESCE(?, pool_order)
        WHERE id = ?
      `);
      
      stmt.run(name, pool_order, req.params.id);
      
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'pools', pool.id, 'update', oldPool, pool);
      
      res.json(pool);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/pools/:id - Delete a pool
  router.delete('/:id', (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      db.prepare('DELETE FROM pools WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'pools', pool.id, 'delete', pool, null);
      
      res.json({ message: 'Pool deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/pools/:id/add-player - Add a player to a pool
  router.post('/:id/add-player', (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      const { registration_id, seed_in_pool } = req.body;
      
      if (!registration_id) {
        return res.status(400).json({ error: 'Registration ID is required' });
      }

      // Check registration exists and is for same tournament
      const registration = db.prepare('SELECT * FROM registrations WHERE id = ?').get(registration_id);
      if (!registration) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      if (registration.tournament_id !== pool.tournament_id) {
        return res.status(400).json({ error: 'Registration is not for this tournament' });
      }

      // Check if already in pool
      const existing = db.prepare('SELECT id FROM pool_players WHERE pool_id = ? AND registration_id = ?')
        .get(req.params.id, registration_id);
      if (existing) {
        return res.status(409).json({ error: 'Player is already in this pool' });
      }

      const stmt = db.prepare(`
        INSERT INTO pool_players (pool_id, registration_id, seed_in_pool)
        VALUES (?, ?, ?)
      `);
      
      const result = stmt.run(req.params.id, registration_id, seed_in_pool);
      
      const poolPlayer = db.prepare(`
        SELECT pp.*, p.first_name, p.last_name
        FROM pool_players pp
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE pp.id = ?
      `).get(result.lastInsertRowid);
      
      createAuditLog(db, 'pool_players', poolPlayer.id, 'create', null, poolPlayer);
      
      res.status(201).json(poolPlayer);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/pools/:id/remove-player/:registration_id - Remove a player from a pool
  router.delete('/:id/remove-player/:registration_id', (req, res) => {
    try {
      const poolPlayer = db.prepare(`
        SELECT * FROM pool_players WHERE pool_id = ? AND registration_id = ?
      `).get(req.params.id, req.params.registration_id);
      
      if (!poolPlayer) {
        return res.status(404).json({ error: 'Player not found in this pool' });
      }

      db.prepare('DELETE FROM pool_players WHERE id = ?').run(poolPlayer.id);
      
      createAuditLog(db, 'pool_players', poolPlayer.id, 'delete', poolPlayer, null);
      
      res.json({ message: 'Player removed from pool' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/pools/auto-generate - Auto-generate pools for a tournament
  router.post('/auto-generate', (req, res) => {
    try {
      const { tournament_id, players_per_pool = 4 } = req.body;
      
      if (!tournament_id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      // Get all registrations sorted by seed
      const registrations = db.prepare(`
        SELECT r.* FROM registrations r
        WHERE r.tournament_id = ? AND r.status != 'withdrawn'
        ORDER BY r.seed ASC NULLS LAST, r.registration_date ASC
      `).all(tournament_id);

      if (registrations.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 players to create pools' });
      }

      // Calculate number of pools
      const numPools = Math.ceil(registrations.length / players_per_pool);
      
      // Use transaction for atomic operation
      const createPools = db.transaction(() => {
        // Delete existing pools for this tournament
        db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(tournament_id);
        
        const pools = [];
        const poolNames = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        // Create pools
        for (let i = 0; i < numPools; i++) {
          const result = db.prepare(`
            INSERT INTO pools (tournament_id, name, pool_order)
            VALUES (?, ?, ?)
          `).run(tournament_id, `Pool ${poolNames[i]}`, i);
          
          pools.push({
            id: result.lastInsertRowid,
            name: `Pool ${poolNames[i]}`,
            pool_order: i,
            players: []
          });
        }
        
        // Distribute players using snake draft (for fair seeding)
        registrations.forEach((reg, index) => {
          const round = Math.floor(index / numPools);
          let poolIndex;
          
          if (round % 2 === 0) {
            poolIndex = index % numPools;
          } else {
            poolIndex = numPools - 1 - (index % numPools);
          }
          
          const seedInPool = Math.floor(index / numPools) + 1;
          
          db.prepare(`
            INSERT INTO pool_players (pool_id, registration_id, seed_in_pool)
            VALUES (?, ?, ?)
          `).run(pools[poolIndex].id, reg.id, seedInPool);
          
          pools[poolIndex].players.push({ registration_id: reg.id, seed_in_pool: seedInPool });
        });
        
        return pools;
      });

      const pools = createPools();
      
      res.status(201).json({ 
        message: `Created ${pools.length} pools`,
        pools 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/pools/:id/standings - Get pool standings
  router.get('/:id/standings', (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      const standings = db.prepare(`
        SELECT pp.*, p.first_name, p.last_name,
               (pp.games_won - pp.games_lost) as game_diff,
               (pp.points_won - pp.points_lost) as point_diff
        FROM pool_players pp
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE pp.pool_id = ?
        ORDER BY pp.wins DESC, game_diff DESC, point_diff DESC, pp.seed_in_pool ASC
      `).all(req.params.id);

      res.json({ pool, standings });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
const { v4: uuidv4 } = require('uuid');
const { requireRole } = require('../middleware/auth');

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

    res.json(result);
  });

  // Update pool player seeding (drag and drop)
  router.put('/:tournamentId/pools/:poolId/players', (req, res) => {
    const { tournamentId, poolId } = req.params;
    const { players } = req.body; // [{ playerId, seedPosition }]

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.pools_published === 1) {
      return res.status(400).json({ error: 'Cannot modify pools after they have been published' });
    }

    const pool = db.prepare('SELECT * FROM pools WHERE id = ? AND tournament_id = ?').get(poolId, tournamentId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    if (!players || !Array.isArray(players)) {
      return res.status(400).json({ error: 'Players array is required' });
    }

    const updatePlayers = db.transaction(() => {
      db.prepare('DELETE FROM pool_players WHERE pool_id = ?').run(poolId);
      for (const player of players) {
        const ppId = crypto.randomUUID();
        db.prepare('INSERT INTO pool_players (id, pool_id, player_id, seed_position) VALUES (?, ?, ?, ?)')
          .run(ppId, poolId, player.playerId, player.seedPosition || 0);
      }
    });

    updatePlayers();

    const updatedPlayers = db.prepare(`
      SELECT pp.*, p.name as player_name, p.email as player_email
      FROM pool_players pp
      JOIN players p ON pp.player_id = p.id
      WHERE pp.pool_id = ?
      ORDER BY pp.seed_position
    `).all(poolId);

    res.json({ ...pool, players: updatedPlayers });
  });

  // Publish pools
  router.patch('/:tournamentId/publish-pools', (req, res) => {
    const { tournamentId } = req.params;
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(tournamentId);
    if (pools.length === 0) {
      return res.status(400).json({ error: 'No pools to publish' });
    }

    db.prepare("UPDATE tournaments SET pools_published = 1, updated_at = datetime('now') WHERE id = ?").run(tournamentId);
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    res.json(updated);
  });

  // Append late registrations to existing pools
  router.post('/:tournamentId/append-late-registrations', (req, res) => {
    const { tournamentId } = req.params;
    const { assignments } = req.body; // [{ playerId, poolId, seedPosition }]

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Tournament must be in progress to append late registrations' });
    }

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Assignments array is required' });
    }

    const appendPlayers = db.transaction(() => {
      const newMatches = [];
      for (const assignment of assignments) {
        // Add player to pool
        const ppId = crypto.randomUUID();
        db.prepare('INSERT OR IGNORE INTO pool_players (id, pool_id, player_id, seed_position) VALUES (?, ?, ?, ?)')
          .run(ppId, assignment.poolId, assignment.playerId, assignment.seedPosition || 0);

        // Generate matches for this late player against existing pool players
        const existingPlayers = db.prepare(
          'SELECT player_id FROM pool_players WHERE pool_id = ? AND player_id != ?'
        ).all(assignment.poolId, assignment.playerId);

        for (const ep of existingPlayers) {
          const matchId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO matches (id, tournament_id, pool_id, round, bracket_stage, player1_id, player2_id, status)
            VALUES (?, ?, ?, 1, 'pool', ?, ?, 'pending')
          `).run(matchId, tournamentId, assignment.poolId, assignment.playerId, ep.player_id);
          newMatches.push(matchId);
        }
      }
      return newMatches;
    });

    const matchIds = appendPlayers();
    const newMatches = matchIds.map(id =>
      db.prepare(`
        SELECT m.*, p1.name as player1_name, p2.name as player2_name
        FROM matches m
        LEFT JOIN players p1 ON m.player1_id = p1.id
        LEFT JOIN players p2 ON m.player2_id = p2.id
        WHERE m.id = ?
      `).get(id)
    );

    res.status(201).json({ message: 'Late registrations appended', newMatches });
    res.json(poolsWithPlayers);
  });

  // Create pool (host only)
  router.post('/', requireRole('host'), (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Pool name is required' });

    const id = uuidv4();
    db.prepare('INSERT INTO pools (id, tournament_id, name) VALUES (?, ?, ?)')
      .run(id, req.params.tournamentId, name);

    const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(id);
    res.status(201).json({ ...pool, players: [] });
  });

  // Add player to pool (host only)
  router.post('/:poolId/players', requireRole('host'), (req, res) => {
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

  // Remove player from pool (host only)
  router.delete('/:poolId/players/:playerId', requireRole('host'), (req, res) => {
    db.prepare('DELETE FROM pool_players WHERE pool_id = ? AND player_id = ?')
      .run(req.params.poolId, req.params.playerId);
    res.json({ message: 'Player removed from pool' });
  });

  // Delete pool (host only)
  router.delete('/:poolId', requireRole('host'), (req, res) => {
    db.prepare('DELETE FROM pool_players WHERE pool_id = ?').run(req.params.poolId);
    db.prepare('DELETE FROM pools WHERE id = ?').run(req.params.poolId);
    res.json({ message: 'Pool deleted' });
  });

  return router;
}

module.exports = createRouter;
module.exports = createPoolRoutes;
