const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb, initializeDb } = require('./models/database');
const { authMiddleware } = require('./middleware/auth');
const createAuthRoutes = require('./routes/auth');
const createTournamentRoutes = require('./routes/tournaments');
const createRegistrationRoutes = require('./routes/registrations');
const createMatchRoutes = require('./routes/matches');
const createPoolRoutes = require('./routes/pools');
const createStaffRoutes = require('./routes/staff');
const createMessageRoutes = require('./routes/messages');
const createPaymentRoutes = require('./routes/payments');

function createApp(dbPath) {
  const app = express();
  const db = getDb(dbPath);
  initializeDb(db);

  app.use(cors());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Auth middleware - attaches req.user for all API routes
  app.use('/api', authMiddleware(db));

  // Auth Routes (public)
  app.use('/api/auth', createAuthRoutes(db));

  // API Routes
  app.use('/api/tournaments', createTournamentRoutes(db));
  app.use('/api/tournaments/:tournamentId/registrations', createRegistrationRoutes(db));
  app.use('/api/tournaments/:tournamentId/matches', createMatchRoutes(db));
  app.use('/api/tournaments/:tournamentId/pools', createPoolRoutes(db));
  app.use('/api/tournaments/:tournamentId/staff', createStaffRoutes(db));
  app.use('/api/tournaments/:tournamentId/messages', createMessageRoutes(db));
  app.use('/api/tournaments/:tournamentId/payments', createPaymentRoutes(db));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.db = db;
  return app;
}

module.exports = createApp;
