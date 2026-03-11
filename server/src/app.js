const express = require('express');
const cors = require('cors');
const { getDb } = require('./models/database');
const createTournamentRoutes = require('./routes/tournaments');
const createRegistrationRoutes = require('./routes/registrations');
const createPoolRoutes = require('./routes/pools');
const createMatchRoutes = require('./routes/matches');

function createApp(dbPath) {
  const app = express();
  const db = getDb(dbPath);

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/tournaments', createTournamentRoutes(db));
  app.use('/api/tournaments', createRegistrationRoutes(db));
  app.use('/api/tournaments', createPoolRoutes(db));
  app.use('/api/tournaments', createMatchRoutes(db));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return { app, db };
}

module.exports = createApp;
