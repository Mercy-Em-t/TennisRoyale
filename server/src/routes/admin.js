const express = require('express');
const { authenticate } = require('../middleware/auth');

function createAdminRouter(db) {
  const router = express.Router();

  // GET /api/admin/revenue
  router.get('/revenue', authenticate, (req, res) => {
    try {
      const totalRevenue = db.prepare(
        'SELECT COALESCE(SUM(platform_revenue), 0) as total FROM platform_wallet'
      ).get().total;

      const monthlyRevenue = db.prepare(
        `SELECT COALESCE(SUM(platform_revenue), 0) as total FROM platform_wallet
         WHERE created_at >= datetime('now', '-30 days')`
      ).get().total;

      const tournamentsHosted = db.prepare(
        'SELECT COUNT(*) as count FROM tournaments'
      ).get().count;

      const totalCollected = db.prepare(
        'SELECT COALESCE(SUM(total_collected), 0) as total FROM platform_wallet'
      ).get().total;

      res.json({
        total_revenue: totalRevenue,
        monthly_revenue: monthlyRevenue,
        tournaments_hosted: tournamentsHosted,
        total_collected: totalCollected
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch revenue data' });
    }
  });

  return router;
}

module.exports = createAdminRouter;
