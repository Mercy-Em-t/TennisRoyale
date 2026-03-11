const { Router } = require('express');
const crypto = require('crypto');

function createMatchRoutes(db) {
  const router = Router();

  // Generate matches for a tournament (pool play round-robin)
  router.post('/:tournamentId/generate-matches', (req, res) => {
    const { tournamentId } = req.params;

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.pools_published !== 1) {
      return res.status(400).json({ error: 'Pools must be published before generating matches' });
    }

    const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(tournamentId);
    if (pools.length === 0) {
      return res.status(400).json({ error: 'No pools found' });
    }

    const generateMatches = db.transaction(() => {
      const allMatches = [];

      for (const pool of pools) {
        const players = db.prepare('SELECT player_id FROM pool_players WHERE pool_id = ? ORDER BY seed_position')
          .all(pool.id);

        // Generate round-robin matches within each pool
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            // Check if match already exists
            const existing = db.prepare(`
              SELECT id FROM matches
              WHERE tournament_id = ? AND pool_id = ?
              AND ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
            `).get(tournamentId, pool.id, players[i].player_id, players[j].player_id, players[j].player_id, players[i].player_id);

            if (!existing) {
              const matchId = crypto.randomUUID();
              db.prepare(`
                INSERT INTO matches (id, tournament_id, pool_id, round, bracket_stage, player1_id, player2_id, status)
                VALUES (?, ?, ?, 1, 'pool', ?, ?, 'pending')
              `).run(matchId, tournamentId, pool.id, players[i].player_id, players[j].player_id);
              allMatches.push(matchId);
            }
          }
        }
      }

      // Set tournament status to in_progress
      db.prepare("UPDATE tournaments SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?").run(tournamentId);

      return allMatches;
    });

    const matchIds = generateMatches();
    const matches = matchIds.map(id =>
      db.prepare(`
        SELECT m.*, p1.name as player1_name, p2.name as player2_name
        FROM matches m
        LEFT JOIN players p1 ON m.player1_id = p1.id
        LEFT JOIN players p2 ON m.player2_id = p2.id
        WHERE m.id = ?
      `).get(id)
    );

    res.status(201).json(matches);
  });

  // Get matches for a tournament
  router.get('/:tournamentId/matches', (req, res) => {
    const { tournamentId } = req.params;
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const matches = db.prepare(`
      SELECT m.*,
        p1.name as player1_name,
        p2.name as player2_name,
        w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.tournament_id = ?
      ORDER BY m.bracket_stage, m.round, m.created_at
    `).all(tournamentId);

    res.json(matches);
  });

  // Schedule a match
  router.patch('/matches/:matchId/schedule', (req, res) => {
    const { matchId } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    db.prepare("UPDATE matches SET scheduled_at = ?, status = 'scheduled' WHERE id = ?").run(scheduledAt, matchId);
    const updated = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      WHERE m.id = ?
    `).get(matchId);
    res.json(updated);
  });

  // Score a match
  router.patch('/matches/:matchId/score', (req, res) => {
    const { matchId } = req.params;
    const { scorePlayer1, scorePlayer2 } = req.body;

    if (scorePlayer1 === undefined || scorePlayer2 === undefined) {
      return res.status(400).json({ error: 'Both scores are required' });
    }
    if (typeof scorePlayer1 !== 'number' || typeof scorePlayer2 !== 'number') {
      return res.status(400).json({ error: 'Scores must be numbers' });
    }
    if (scorePlayer1 < 0 || scorePlayer2 < 0) {
      return res.status(400).json({ error: 'Scores must be non-negative' });
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (match.status === 'completed') {
      return res.status(400).json({ error: 'Match is already completed' });
    }

    const winnerId = scorePlayer1 > scorePlayer2 ? match.player1_id : match.player2_id;

    db.prepare(`
      UPDATE matches
      SET score_player1 = ?, score_player2 = ?, winner_id = ?, status = 'completed'
      WHERE id = ?
    `).run(scorePlayer1, scorePlayer2, winnerId, matchId);

    const updated = db.prepare(`
      SELECT m.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
      FROM matches m
      LEFT JOIN players p1 ON m.player1_id = p1.id
      LEFT JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.id = ?
    `).get(matchId);
    res.json(updated);
  });

  // Advance bracket (generate next round matches from pool winners)
  router.post('/:tournamentId/advance-bracket', (req, res) => {
    const { tournamentId } = req.params;
    const { bracketStage } = req.body; // 'quarterfinal', 'semifinal', 'final'

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    if (tournament.status !== 'in_progress') {
      return res.status(400).json({ error: 'Tournament must be in progress' });
    }

    if (!bracketStage) {
      return res.status(400).json({ error: 'Bracket stage is required (quarterfinal, semifinal, final)' });
    }

    const advanceBracket = db.transaction(() => {
      let qualifiedPlayers = [];

      if (bracketStage === 'quarterfinal' || bracketStage === 'semifinal_from_pools') {
        // Get pool standings (win count per player per pool)
        const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ?').all(tournamentId);

        for (const pool of pools) {
          const standings = db.prepare(`
            SELECT winner_id, COUNT(*) as wins
            FROM matches
            WHERE pool_id = ? AND status = 'completed' AND bracket_stage = 'pool'
            GROUP BY winner_id
            ORDER BY wins DESC
          `).all(pool.id);

          // Top players from each pool advance
          const advanceCount = Math.min(2, standings.length);
          for (let i = 0; i < advanceCount; i++) {
            if (standings[i]) {
              qualifiedPlayers.push(standings[i].winner_id);
            }
          }
        }
      } else {
        // Get winners from previous bracket stage
        const prevStage = bracketStage === 'semifinal' ? 'quarterfinal' : 
                          bracketStage === 'final' ? 'semifinal' : null;
        if (!prevStage) {
          throw new Error('Invalid bracket stage progression');
        }

        const winners = db.prepare(`
          SELECT winner_id FROM matches
          WHERE tournament_id = ? AND bracket_stage = ? AND status = 'completed'
        `).all(tournamentId, prevStage);

        qualifiedPlayers = winners.map(w => w.winner_id);
      }

      if (qualifiedPlayers.length < 2) {
        throw new Error('Not enough players to advance bracket');
      }

      // Generate bracket matches
      const newMatches = [];
      for (let i = 0; i < qualifiedPlayers.length; i += 2) {
        if (i + 1 < qualifiedPlayers.length) {
          const matchId = crypto.randomUUID();
          const round = bracketStage === 'quarterfinal' ? 2 :
                        bracketStage === 'semifinal' || bracketStage === 'semifinal_from_pools' ? 3 :
                        bracketStage === 'final' ? 4 : 2;
          db.prepare(`
            INSERT INTO matches (id, tournament_id, round, bracket_stage, player1_id, player2_id, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `).run(matchId, tournamentId, round, bracketStage, qualifiedPlayers[i], qualifiedPlayers[i + 1]);
          newMatches.push(matchId);
        }
      }

      return newMatches;
    });

    try {
      const matchIds = advanceBracket();
      const matches = matchIds.map(id =>
        db.prepare(`
          SELECT m.*, p1.name as player1_name, p2.name as player2_name
          FROM matches m
          LEFT JOIN players p1 ON m.player1_id = p1.id
          LEFT JOIN players p2 ON m.player2_id = p2.id
          WHERE m.id = ?
        `).get(id)
      );
      res.status(201).json(matches);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createMatchRoutes;
