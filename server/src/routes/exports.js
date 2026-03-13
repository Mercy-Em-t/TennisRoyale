const express = require('express');

function createRouter(db) {
  const router = express.Router({ mergeParams: true });

  // GET /api/tournaments/:id/export - Export full tournament data
  router.get('/', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const registrations = db.prepare(`
        SELECT r.*, p.first_name, p.last_name, p.email, p.phone, p.skill_level
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
        ORDER BY r.registration_date ASC
      `).all(req.params.id);

      const pools = db.prepare('SELECT * FROM pools WHERE tournament_id = ? ORDER BY pool_order').all(req.params.id);

      const poolPlayers = db.prepare(`
        SELECT pp.*, p.first_name, p.last_name, po.name as pool_name
        FROM pool_players pp
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        JOIN pools po ON pp.pool_id = po.id
        WHERE r.tournament_id = ?
      `).all(req.params.id);

      const matches = db.prepare(`
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
        WHERE m.tournament_id = ?
        ORDER BY m.bracket_stage, m.round_number, m.match_number
      `).all(req.params.id);

      const courts = db.prepare('SELECT * FROM courts WHERE tournament_id = ?').all(req.params.id);

      const payments = db.prepare(`
        SELECT pay.*, p.first_name, p.last_name
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
      `).all(req.params.id);

      const exportData = {
        exported_at: new Date().toISOString(),
        tournament,
        registrations,
        pools,
        pool_players: poolPlayers,
        matches,
        courts,
        payments,
        summary: {
          total_registrations: registrations.length,
          total_matches: matches.length,
          completed_matches: matches.filter(m => m.status === 'completed').length,
          total_pools: pools.length,
          total_courts: courts.length
        }
      };

      res.json(exportData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/export/registrations - Export registrations
  router.get('/registrations', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const registrations = db.prepare(`
        SELECT r.id, r.registration_date, r.status, r.seed, r.payment_status, r.waiver_signed, r.check_in_time,
               p.first_name, p.last_name, p.email, p.phone, p.skill_level
        FROM registrations r
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
        ORDER BY r.registration_date ASC
      `).all(req.params.id);

      const format = req.query.format || 'json';

      if (format === 'csv') {
        const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Skill Level', 'Registration Date', 'Status', 'Seed', 'Payment Status', 'Waiver Signed', 'Check-in Time'];
        const rows = registrations.map(r => [
          r.id, r.first_name, r.last_name, r.email, r.phone || '', r.skill_level || '',
          r.registration_date, r.status, r.seed || '', r.payment_status, r.waiver_signed ? 'Yes' : 'No', r.check_in_time || ''
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="registrations-${tournament.id}.csv"`);
        res.send(csv);
      } else {
        res.json(registrations);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/export/matches - Export matches
  router.get('/matches', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const matches = db.prepare(`
        SELECT m.id, m.scheduled_time, m.actual_start_time, m.actual_end_time, m.status,
               m.bracket_stage, m.round_number, m.match_number,
               m.player1_score, m.player2_score,
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name,
               c.name as court_name, po.name as pool_name,
               CASE WHEN m.winner_registration_id = r1.id THEN p1.first_name || ' ' || p1.last_name
                    WHEN m.winner_registration_id = r2.id THEN p2.first_name || ' ' || p2.last_name
                    ELSE '' END as winner
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        LEFT JOIN courts c ON m.court_id = c.id
        LEFT JOIN pools po ON m.pool_id = po.id
        WHERE m.tournament_id = ?
        ORDER BY m.bracket_stage, m.round_number, m.match_number
      `).all(req.params.id);

      const format = req.query.format || 'json';

      if (format === 'csv') {
        const headers = ['Match ID', 'Stage', 'Round', 'Match #', 'Player 1', 'Player 2', 'Score', 'Winner', 'Court', 'Pool', 'Scheduled', 'Status'];
        const rows = matches.map(m => [
          m.id, m.bracket_stage, m.round_number || '', m.match_number || '',
          `${m.player1_first_name} ${m.player1_last_name}`,
          `${m.player2_first_name} ${m.player2_last_name}`,
          m.player1_score && m.player2_score ? `${m.player1_score} vs ${m.player2_score}` : '',
          m.winner || '', m.court_name || '', m.pool_name || '', m.scheduled_time || '', m.status
        ]);

        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="matches-${tournament.id}.csv"`);
        res.send(csv);
      } else {
        res.json(matches);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/exports/tournament/:id/bracket - Export bracket structure
  router.get('/tournament/:id/bracket', (req, res) => {
    try {
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const bracketMatches = db.prepare(`
        SELECT m.*, 
               p1.first_name as player1_first_name, p1.last_name as player1_last_name,
               p2.first_name as player2_first_name, p2.last_name as player2_last_name
        FROM matches m
        JOIN registrations r1 ON m.player1_registration_id = r1.id
        JOIN players p1 ON r1.player_id = p1.id
        JOIN registrations r2 ON m.player2_registration_id = r2.id
        JOIN players p2 ON r2.player_id = p2.id
        WHERE m.tournament_id = ? AND m.bracket_stage != 'pool'
        ORDER BY m.bracket_stage DESC, m.bracket_position ASC
      `).all(req.params.id);

      // Organize by stage
      const bracket = {
        tournament,
        stages: {}
      };

      const stageOrder = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

      stageOrder.forEach(stage => {
        const stageMatches = bracketMatches.filter(m => m.bracket_stage === stage);
        if (stageMatches.length > 0) {
          bracket.stages[stage] = stageMatches.map(m => ({
            position: m.bracket_position,
            player1: {
              name: `${m.player1_first_name} ${m.player1_last_name}`,
              registration_id: m.player1_registration_id,
              score: m.player1_score
            },
            player2: {
              name: `${m.player2_first_name} ${m.player2_last_name}`,
              registration_id: m.player2_registration_id,
              score: m.player2_score
            },
            winner_registration_id: m.winner_registration_id,
            status: m.status
          }));
        }
      });

      res.json(bracket);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/export/standings - Export standings
  router.get('/standings', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const poolStandings = db.prepare(`
        SELECT po.name as pool_name, pp.*, p.first_name, p.last_name,
               (pp.games_won - pp.games_lost) as game_diff
        FROM pool_players pp
        JOIN pools po ON pp.pool_id = po.id
        JOIN registrations r ON pp.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE po.tournament_id = ?
        ORDER BY po.pool_order, pp.wins DESC, game_diff DESC
      `).all(req.params.id);

      // Group by pool
      const byPool = {};
      poolStandings.forEach(ps => {
        if (!byPool[ps.pool_name]) {
          byPool[ps.pool_name] = [];
        }
        byPool[ps.pool_name].push({
          rank: byPool[ps.pool_name].length + 1,
          player: `${ps.first_name} ${ps.last_name}`,
          wins: ps.wins,
          losses: ps.losses,
          games_won: ps.games_won,
          games_lost: ps.games_lost,
          game_diff: ps.game_diff
        });
      });

      const format = req.query.format || 'json';

      if (format === 'csv') {
        const headers = ['Pool', 'Rank', 'Player', 'Wins', 'Losses', 'Games Won', 'Games Lost', 'Game Diff'];
        const rows = [];
        Object.entries(byPool).forEach(([poolName, players]) => {
          players.forEach(p => {
            rows.push([poolName, p.rank, p.player, p.wins, p.losses, p.games_won, p.games_lost, p.game_diff]);
          });
        });

        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="standings-${tournament.id}.csv"`);
        res.send(csv);
      } else {
        res.json({ tournament, pool_standings: byPool });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/tournaments/:id/export/financial - Export financial report
  router.get('/financial', (req, res) => {
    try {
      const tournamentId = req.params.tournamentId || req.params.id;
      const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      const payments = db.prepare(`
        SELECT pay.*, p.first_name, p.last_name, p.email
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        JOIN players p ON r.player_id = p.id
        WHERE r.tournament_id = ?
        ORDER BY pay.created_at ASC
      `).all(req.params.id);

      const summary = db.prepare(`
        SELECT 
          COALESCE(SUM(CASE WHEN pay.amount > 0 AND pay.status = 'completed' THEN pay.amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN pay.amount < 0 AND pay.status = 'completed' THEN ABS(pay.amount) ELSE 0 END), 0) as total_refunds,
          COUNT(DISTINCT CASE WHEN pay.status = 'completed' AND pay.amount > 0 THEN pay.registration_id END) as paid_registrations
        FROM payments pay
        JOIN registrations r ON pay.registration_id = r.id
        WHERE r.tournament_id = ?
      `).get(req.params.id);

      const format = req.query.format || 'json';

      if (format === 'csv') {
        const headers = ['Receipt #', 'Date', 'Player', 'Email', 'Amount', 'Currency', 'Method', 'Status', 'Notes'];
        const rows = payments.map(p => [
          p.receipt_number, p.created_at, `${p.first_name} ${p.last_name}`, p.email,
          p.amount, p.currency, p.payment_method, p.status, p.notes || ''
        ]);

        // Add summary row
        rows.push(['', '', '', '', '', '', '', '', '']);
        rows.push(['SUMMARY', '', '', '', '', '', '', '', '']);
        rows.push(['Total Revenue', '', '', '', summary.total_revenue, 'KES', '', '', '']);
        rows.push(['Total Refunds', '', '', '', summary.total_refunds, 'KES', '', '', '']);
        rows.push(['Net Revenue', '', '', '', summary.total_revenue - summary.total_refunds, 'KES', '', '', '']);

        const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="financial-${tournament.id}.csv"`);
        res.send(csv);
      } else {
        res.json({
          tournament,
          payments,
          summary: {
            ...summary,
            net_revenue: summary.total_revenue - summary.total_refunds
          }
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PDF and Excel placeholders as expected by frontend
  router.get('/pdf', (req, res) => {
    res.status(501).json({ error: 'PDF export not implemented in this version' });
  });

  router.get('/excel', (req, res) => {
    res.status(501).json({ error: 'Excel export not implemented in this version' });
  });

  return router;
}

module.exports = createRouter;
