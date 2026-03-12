const express = require('express');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');

function createHostRouter(db) {
  const router = express.Router();

  // GET /api/host/dashboard
  router.get('/dashboard', authenticate, requireRole('host'), (req, res) => {
    try {
      const totalTournaments = db.prepare(
        'SELECT COUNT(*) as count FROM tournaments WHERE host_id = ?'
      ).get(req.user.id).count;

      const activeTournaments = db.prepare(
        "SELECT COUNT(*) as count FROM tournaments WHERE host_id = ? AND status IN ('published', 'ongoing')"
      ).get(req.user.id).count;

      const totalPlayers = db.prepare(
        `SELECT COUNT(*) as count FROM tournament_registrations tr
         JOIN tournaments t ON tr.tournament_id = t.id
         WHERE t.host_id = ?`
      ).get(req.user.id).count;

      const totalRevenue = db.prepare(
        `SELECT COALESCE(SUM(pw.host_balance), 0) as total FROM platform_wallet pw
         JOIN tournaments t ON pw.tournament_id = t.id
         WHERE t.host_id = ?`
      ).get(req.user.id).total;

      res.json({
        total_tournaments: totalTournaments,
        active_tournaments: activeTournaments,
        players_registered: totalPlayers,
        total_revenue: totalRevenue
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  });

  // POST /api/host/withdraw
  router.post('/withdraw', authenticate, requireRole('host'), (req, res) => {
    try {
      const { tournament_id } = req.body;

      if (!tournament_id) {
        return res.status(400).json({ error: 'tournament_id is required' });
      }

      const tournament = db.prepare(
        'SELECT * FROM tournaments WHERE id = ? AND host_id = ?'
      ).get(tournament_id, req.user.id);

      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }

      if (tournament.status !== 'completed') {
        return res.status(400).json({ error: 'Funds can only be withdrawn after tournament is completed' });
      }

      const wallet = db.prepare(
        'SELECT * FROM platform_wallet WHERE tournament_id = ?'
      ).get(tournament_id);

      if (!wallet) {
        return res.status(404).json({ error: 'No funds found for this tournament' });
      }

      if (wallet.released_to_host) {
        return res.status(400).json({ error: 'Funds already withdrawn' });
      }

      db.prepare(
        'UPDATE platform_wallet SET released_to_host = 1 WHERE id = ?'
      ).run(wallet.id);

      res.json({
        message: 'Withdrawal successful',
        amount: wallet.host_balance,
        tournament_id
      });
    } catch (err) {
      res.status(500).json({ error: 'Withdrawal failed' });
    }
  });

  return router;
}

module.exports = createHostRouter;
