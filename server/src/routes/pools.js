const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireRole, authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../models/database');

/**
 * Pool Routes Factory
 */
function createPoolRoutes(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/pools - List all pools with optional filtering
  router.get('/', (req, res) => {
    try {
      const tournament_id = req.params.tournamentId || req.query.tournament_id;
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
      res.status(500).json({ error: 'Failed to fetch pools', message: err.message });
    }
  });

  // GET /api/pools/:id - Get a specific pool with players
  router.get('/:id', (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) return res.status(404).json({ error: 'Pool not found' });

      const players = db.prepare(`
        SELECT pp.*, r.id as registration_id, p.first_name, p.last_name, p.name, p.email
        FROM pool_players pp
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE pp.pool_id = ?
        ORDER BY pp.seed_in_pool ASC
      `).all(req.params.id);

      res.json({ ...pool, players });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch pool', message: err.message });
    }
  });

  // POST /api/pools - Create a new pool
  router.post('/', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const { tournament_id, name, pool_order } = req.body;
      if (!tournament_id || !name) {
        return res.status(400).json({ error: 'Tournament ID and pool name are required' });
      }

      const id = uuidv4();
      db.prepare(`
        INSERT INTO pools (id, tournament_id, name, pool_order)
        VALUES (?, ?, ?, ?)
      `).run(id, tournament_id, name, pool_order || 0);

      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(id);
      createAuditLog(db, 'pools', id, 'create', null, pool);

      res.status(201).json(pool);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create pool', message: err.message });
    }
  });

  // POST /api/pools/:id/players - Add player to pool
  router.post('/:id/players', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const { registration_id, seed_in_pool } = req.body;
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) return res.status(404).json({ error: 'Pool not found' });

      const id = uuidv4();
      db.prepare(`
        INSERT INTO pool_players (id, pool_id, registration_id, seed_in_pool)
        VALUES (?, ?, ?, ?)
      `).run(id, req.params.id, registration_id, seed_in_pool || 0);

      const pp = db.prepare('SELECT * FROM pool_players WHERE id = ?').get(id);
      createAuditLog(db, 'pool_players', id, 'create', null, pp);

      res.status(201).json(pp);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add player to pool', message: err.message });
    }
  });

  // DELETE /api/pools/:id - Delete a pool
  router.delete('/:id', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const pool = db.prepare('SELECT * FROM pools WHERE id = ?').get(req.params.id);
      if (!pool) return res.status(404).json({ error: 'Pool not found' });

      db.prepare('DELETE FROM pools WHERE id = ?').run(req.params.id);
      createAuditLog(db, 'pools', req.params.id, 'delete', pool, null);

      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete pool', message: err.message });
    }
  });

  // POST /api/pools/auto-generate - Simple auto-generation
  router.post('/auto-generate', authenticate, requireRole('host', 'admin'), (req, res) => {
    try {
      const tournament_id = req.params.tournamentId || req.body.tournament_id;
      const { players_per_pool = 4 } = req.body;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

      const regs = db.prepare(`
        SELECT id FROM registrations 
        WHERE tournament_id = ? AND status != 'withdrawn' 
        ORDER BY seed ASC NULLS LAST, registration_date ASC
      `).all(tournament_id);

      if (regs.length < 2) return res.status(400).json({ error: 'Not enough players' });

      const numPools = Math.ceil(regs.length / players_per_pool);
      const pools = [];

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM pools WHERE tournament_id = ?').run(tournament_id);

        for (let i = 0; i < numPools; i++) {
          const poolId = uuidv4();
          const name = `Pool ${String.fromCharCode(65 + i)}`;
          db.prepare('INSERT INTO pools (id, tournament_id, name, pool_order) VALUES (?, ?, ?, ?)').run(poolId, tournament_id, name, i);
          pools.push({ id: poolId, name, players: [] });
        }

        regs.forEach((reg, idx) => {
          const poolIdx = idx % numPools; // Simple distribution
          const ppId = uuidv4();
          db.prepare('INSERT INTO pool_players (id, pool_id, registration_id, seed_in_pool) VALUES (?, ?, ?, ?)').run(ppId, pools[poolIdx].id, reg.id, Math.floor(idx / numPools) + 1);
        });
      });

      transaction();
      res.json({ message: `Successfully generated ${numPools} pools` });
    } catch (err) {
      res.status(500).json({ error: 'Failed to auto-generate pools', message: err.message });
    }
  });

  return router;
}

module.exports = createPoolRoutes;
