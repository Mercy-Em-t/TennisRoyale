const express = require('express');
const rateLimit = require('express-rate-limit');
const { createDatabase } = require('./models/database');
const { createPlayerRoutes } = require('./routes/players');
const { createTournamentRoutes } = require('./routes/tournaments');
const { createMatchRoutes } = require('./routes/matches');

function createApp(dbPath) {
  const app = express();
  const db = createDatabase(dbPath);

  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  app.use('/api/players', createPlayerRoutes(db));
  app.use('/api/tournaments', createTournamentRoutes(db));
  app.use('/api/matches', createMatchRoutes(db));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.db = db;
  return app;
}

module.exports = { createApp };
