const express = require('express');
const { createAuditLog } = require('../models/database');

function createRouter(db) {
  const router = express.Router();

  // GET /api/matches - List matches (with filtering)
  router.get('/', (req, res) => {
    try {
      const { tournament_id, pool_id, court_id, status, bracket_stage, limit = 100, offset = 0 } = req.query;
      
      let sql = `
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name,
               c.name as court_name, po.name as pool_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        LEFT JOIN courts c ON m.court_id = c.id
        LEFT JOIN pools po ON m.pool_id = po.id
      `;
      
      const params = [];
      const conditions = [];
      
      if (tournament_id) {
        conditions.push('m.tournament_id = ?');
        params.push(tournament_id);
      }
      if (pool_id) {
        conditions.push('m.pool_id = ?');
        params.push(pool_id);
      }
      if (court_id) {
        conditions.push('m.court_id = ?');
        params.push(court_id);
      }
      if (status) {
        conditions.push('m.status = ?');
        params.push(status);
      }
      if (bracket_stage) {
        conditions.push('m.bracket_stage = ?');
        params.push(bracket_stage);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY m.scheduled_time ASC, m.match_number ASC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const matches = db.prepare(sql).all(...params);
      res.json(matches);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/matches/:id - Get a specific match
  router.get('/:id', (req, res) => {
    try {
      const match = db.prepare(`
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name,
               c.name as court_name, po.name as pool_name,
               t.name as tournament_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        LEFT JOIN courts c ON m.court_id = c.id
        LEFT JOIN pools po ON m.pool_id = po.id
        JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.id = ?
      `).get(req.params.id);
      
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches - Create a new match
  router.post('/', (req, res) => {
    try {
      const { 
        tournament_id, pool_id, court_id,
        player1_registration_id, player2_registration_id,
        scheduled_time, bracket_stage, bracket_position, round_number, match_number
      } = req.body;
      
      if (!tournament_id || !player1_registration_id || !player2_registration_id) {
        return res.status(400).json({ error: 'Tournament ID and both player registration IDs are required' });
      }

      if (player1_registration_id === player2_registration_id) {
        return res.status(400).json({ error: 'Cannot create a match with the same player' });
      }

      const stmt = db.prepare(`
        INSERT INTO matches (
          tournament_id, pool_id, court_id,
          player1_registration_id, player2_registration_id,
          scheduled_time, bracket_stage, bracket_position, round_number, match_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        tournament_id, pool_id, court_id,
        player1_registration_id, player2_registration_id,
        scheduled_time, bracket_stage || 'pool', bracket_position, round_number, match_number
      );
      
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid);
      
      createAuditLog(db, 'matches', match.id, 'create', null, match);
      
      res.status(201).json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /api/matches/:id - Update a match (scheduling)
  router.put('/:id', (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const { court_id, scheduled_time, notes } = req.body;
      
      const stmt = db.prepare(`
        UPDATE matches SET
          court_id = COALESCE(?, court_id),
          scheduled_time = COALESCE(?, scheduled_time),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(court_id, scheduled_time, notes, req.params.id);
      
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);
      
      // Broadcast update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'match_updated', match });
      }
      
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/:id/start - Start a match
  router.post('/:id/start', (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }
      if (oldMatch.status !== 'scheduled') {
        return res.status(400).json({ error: 'Match is not in scheduled status' });
      }

      db.prepare(`
        UPDATE matches SET status = 'in_progress', actual_start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.params.id);
      
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);
      
      // Broadcast update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'match_started', match });
      }
      
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/:id/score - Update match score (live scoring)
  router.post('/:id/score', (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      const { player1_score, player2_score, winner_registration_id, status } = req.body;
      
      // If setting a winner, match is completed
      const newStatus = winner_registration_id ? 'completed' : (status || oldMatch.status);
      const endTime = winner_registration_id ? 'CURRENT_TIMESTAMP' : null;
      
      const stmt = db.prepare(`
        UPDATE matches SET
          player1_score = COALESCE(?, player1_score),
          player2_score = COALESCE(?, player2_score),
          winner_registration_id = COALESCE(?, winner_registration_id),
          status = ?,
          actual_end_time = ${endTime ? 'CURRENT_TIMESTAMP' : 'actual_end_time'},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      
      stmt.run(player1_score, player2_score, winner_registration_id, newStatus, req.params.id);
      
      const match = db.prepare(`
        SELECT m.*,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.id = ?
      `).get(req.params.id);
      
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);
      
      // If match completed, update pool standings
      if (winner_registration_id && match.pool_id) {
        updatePoolStandings(db, match);
      }
      
      // Broadcast live score update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { 
          type: winner_registration_id ? 'match_completed' : 'score_update', 
          match 
        });
      }
      
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper function to update pool standings
  function updatePoolStandings(db, match) {
    const scores1 = parseScore(match.player1_score);
    const scores2 = parseScore(match.player2_score);
    
    const winner = match.winner_registration_id;
    const loser = winner === match.player1_registration_id 
      ? match.player2_registration_id 
      : match.player1_registration_id;

    // Calculate games won/lost
    const player1Games = scores1.reduce((a, b) => a + b, 0);
    const player2Games = scores2.reduce((a, b) => a + b, 0);
    
    // Update winner stats
    db.prepare(`
      UPDATE pool_players SET
        wins = wins + 1,
        games_won = games_won + ?,
        games_lost = games_lost + ?
      WHERE pool_id = ? AND registration_id = ?
    `).run(
      winner === match.player1_registration_id ? player1Games : player2Games,
      winner === match.player1_registration_id ? player2Games : player1Games,
      match.pool_id, winner
    );
    
    // Update loser stats
    db.prepare(`
      UPDATE pool_players SET
        losses = losses + 1,
        games_won = games_won + ?,
        games_lost = games_lost + ?
      WHERE pool_id = ? AND registration_id = ?
    `).run(
      loser === match.player1_registration_id ? player1Games : player2Games,
      loser === match.player1_registration_id ? player2Games : player1Games,
      match.pool_id, loser
    );
  }

  // Parse score string (e.g., "6-4,7-5" -> [6, 7])
  function parseScore(scoreStr) {
    if (!scoreStr) return [0];
    try {
      return scoreStr.split(',').map(set => {
        const parts = set.split('-');
        return parseInt(parts[0]) || 0;
      });
    } catch {
      return [0];
    }
  }

  // POST /api/matches/:id/forfeit - Forfeit a match
  router.post('/:id/forfeit', (req, res) => {
    try {
      const oldMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!oldMatch) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const { forfeit_registration_id, reason } = req.body;
      
      if (!forfeit_registration_id) {
        return res.status(400).json({ error: 'Forfeiting player registration ID is required' });
      }

      // Winner is the other player
      const winner = forfeit_registration_id === oldMatch.player1_registration_id
        ? oldMatch.player2_registration_id
        : oldMatch.player1_registration_id;

      db.prepare(`
        UPDATE matches SET
          status = 'forfeited',
          winner_registration_id = ?,
          notes = COALESCE(?, '') || ' Forfeit: ' || ?,
          actual_end_time = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(winner, oldMatch.notes, reason || 'No reason provided', req.params.id);
      
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      
      createAuditLog(db, 'matches', match.id, 'update', oldMatch, match);
      
      // Broadcast update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'match_forfeited', match });
      }
      
      res.json(match);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/generate-pool-matches - Generate round-robin matches for pools
  router.post('/generate-pool-matches', (req, res) => {
    try {
      const { tournament_id } = req.body;
      
      if (!tournament_id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(tournament_id);
      if (pools.length === 0) {
        return res.status(400).json({ error: 'No pools found for this tournament' });
      }

      const generateMatches = db.transaction(() => {
        let totalMatches = 0;
        let matchNumber = 1;
        
        pools.forEach(pool => {
          const players = db.prepare(`
            SELECT registration_id FROM pool_players WHERE pool_id = ? ORDER BY seed_in_pool
          `).all(pool.id);
          
          // Generate round-robin matches
          for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
              db.prepare(`
                INSERT INTO matches (
                  tournament_id, pool_id, player1_registration_id, player2_registration_id,
                  bracket_stage, round_number, match_number
                ) VALUES (?, ?, ?, ?, 'pool', 1, ?)
              `).run(tournament_id, pool.id, players[i].registration_id, players[j].registration_id, matchNumber++);
              totalMatches++;
            }
          }
        });
        
        return totalMatches;
      });

      const totalMatches = generateMatches();
      
      res.status(201).json({ 
        message: `Generated ${totalMatches} pool matches`,
        match_count: totalMatches 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/matches/generate-bracket - Generate bracket matches from pool results
  router.post('/generate-bracket', (req, res) => {
    try {
      const { tournament_id, bracket_size = 8 } = req.body;
      
      if (!tournament_id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      // Get pool standings
      const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ? ORDER BY pool_order').all(tournament_id);
      
      if (pools.length === 0) {
        return res.status(400).json({ error: 'No pools found for this tournament' });
      }

      // Get top players from each pool
      const qualifiers = [];
      const qualifiersPerPool = Math.ceil(bracket_size / pools.length);
      
      pools.forEach(pool => {
        const standings = db.prepare(`
          SELECT pp.registration_id,
                 (pp.games_won - pp.games_lost) as game_diff,
                 (pp.points_won - pp.points_lost) as point_diff
          FROM pool_players pp
          WHERE pp.pool_id = ?
          ORDER BY pp.wins DESC, game_diff DESC, point_diff DESC, pp.seed_in_pool ASC
          LIMIT ?
        `).all(pool.id, qualifiersPerPool);
        
        standings.forEach((s, index) => {
          qualifiers.push({
            registration_id: s.registration_id,
            pool_order: pool.pool_order,
            position: index + 1
          });
        });
      });

      // Limit to bracket size
      const bracketPlayers = qualifiers.slice(0, bracket_size);

      // Determine bracket stage
      let bracketStage;
      switch (bracket_size) {
        case 32: bracketStage = 'round_of_32'; break;
        case 16: bracketStage = 'round_of_16'; break;
        case 8: bracketStage = 'quarterfinal'; break;
        case 4: bracketStage = 'semifinal'; break;
        case 2: bracketStage = 'final'; break;
        default: bracketStage = 'quarterfinal';
      }

      const generateBracket = db.transaction(() => {
        // Standard bracket seeding (1v8, 4v5, 3v6, 2v7 for 8 players)
        const seeding = getBracketSeeding(bracketPlayers.length);
        const matches = [];
        
        for (let i = 0; i < seeding.length; i += 2) {
          const p1Idx = seeding[i] - 1;
          const p2Idx = seeding[i + 1] - 1;
          
          if (p1Idx < bracketPlayers.length && p2Idx < bracketPlayers.length) {
            const result = db.prepare(`
              INSERT INTO matches (
                tournament_id, player1_registration_id, player2_registration_id,
                bracket_stage, bracket_position, round_number, match_number
              ) VALUES (?, ?, ?, ?, ?, 1, ?)
            `).run(
              tournament_id,
              bracketPlayers[p1Idx].registration_id,
              bracketPlayers[p2Idx].registration_id,
              bracketStage,
              Math.floor(i / 2) + 1,
              matches.length + 1
            );
            matches.push(result.lastInsertRowid);
          }
        }
        
        return matches;
      });

      const matchIds = generateBracket();
      
      res.status(201).json({ 
        message: `Generated ${matchIds.length} bracket matches`,
        bracket_stage: bracketStage,
        match_ids: matchIds 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper function for bracket seeding
  function getBracketSeeding(numPlayers) {
    // Standard bracket seeding ensures top seeds meet later
    const seeds = {
      2: [1, 2],
      4: [1, 4, 3, 2],
      8: [1, 8, 4, 5, 3, 6, 2, 7],
      16: [1, 16, 8, 9, 4, 13, 5, 12, 3, 14, 6, 11, 2, 15, 7, 10],
      32: [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 
           3, 30, 14, 19, 6, 27, 11, 22, 2, 31, 15, 18, 7, 26, 10, 23]
    };
    return seeds[numPlayers] || seeds[8];
  }

  // POST /api/matches/:id/advance-winner - Advance winner to next bracket round
  router.post('/:id/advance-winner', (req, res) => {
    try {
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }
      if (!match.winner_registration_id) {
        return res.status(400).json({ error: 'Match does not have a winner yet' });
      }

      // Determine next bracket stage
      const stageOrder = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'];
      const currentIndex = stageOrder.indexOf(match.bracket_stage);
      
      if (currentIndex === -1 || currentIndex >= stageOrder.length - 1) {
        return res.json({ message: 'No next stage - tournament complete or pool match', match });
      }

      const nextStage = stageOrder[currentIndex + 1];
      const nextPosition = Math.ceil(match.bracket_position / 2);

      // Find or create next match
      let nextMatch = db.prepare(`
        SELECT * FROM matches 
        WHERE tournament_id = ? AND bracket_stage = ? AND bracket_position = ?
      `).get(match.tournament_id, nextStage, nextPosition);

      if (!nextMatch) {
        // Create placeholder match
        const slot = match.bracket_position % 2 === 1 ? 'player1' : 'player2';
        const result = db.prepare(`
          INSERT INTO matches (tournament_id, ${slot}_registration_id, bracket_stage, bracket_position, round_number)
          VALUES (?, ?, ?, ?, ?)
        `).run(match.tournament_id, match.winner_registration_id, nextStage, nextPosition, currentIndex + 2);
        
        nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(result.lastInsertRowid);
      } else {
        // Update existing match
        const slot = match.bracket_position % 2 === 1 ? 'player1_registration_id' : 'player2_registration_id';
        db.prepare(`UPDATE matches SET ${slot} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(match.winner_registration_id, nextMatch.id);
        
        nextMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(nextMatch.id);
      }

      // Broadcast bracket update
      const broadcast = req.app.get('broadcast');
      if (broadcast) {
        broadcast(match.tournament_id, { type: 'bracket_updated', match: nextMatch });
      }

      res.json({ 
        message: `Winner advanced to ${nextStage}`,
        previous_match: match,
        next_match: nextMatch 
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/matches/:id - Delete a match
  router.delete('/:id', (req, res) => {
    try {
      const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
      if (!match) {
        return res.status(404).json({ error: 'Match not found' });
      }

      db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id);
      
      createAuditLog(db, 'matches', match.id, 'delete', match, null);
      
      res.json({ message: 'Match deleted', id: req.params.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
