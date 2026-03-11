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
  });

  return router;
}

module.exports = createRouter;
