const express = require('express');
const { authenticate } = require('../middleware/auth');

function createPlayerRouter(db) {
  const router = express.Router();

  // GET /api/player/tournaments
  router.get('/tournaments', authenticate, (req, res) => {
    try {
      const tournaments = db.prepare(
        `SELECT t.*, tr.payment_status, tr.created_at as registered_at
         FROM tournament_registrations tr
         JOIN tournaments t ON tr.tournament_id = t.id
         WHERE tr.player_id = ?
         ORDER BY t.start_date ASC`
      ).all(req.user.id);

      res.json({ tournaments });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch player tournaments' });
    }
  });

  return router;
}

module.exports = createPlayerRouter;
