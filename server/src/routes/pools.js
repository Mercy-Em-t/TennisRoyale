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
  });

  return router;
}

module.exports = createPoolRoutes;
