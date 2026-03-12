const express = require('express');
const { createDatabase } = require('./models/database');
const { createPlayerRoutes } = require('./routes/players');
const { createTournamentRoutes } = require('./routes/tournaments');
const { createMatchRoutes } = require('./routes/matches');

function createApp(dbPath) {
  const app = express();
  const db = createDatabase(dbPath);

  app.use(express.json());

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
