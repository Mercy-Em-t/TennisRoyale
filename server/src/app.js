const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb, initializeDb } = require('./models/database');

// Import route creators
const createAuthRoutes = require('./routes/auth');
const createPlayerRoutes = require('./routes/players');
const createTournamentRoutes = require('./routes/tournaments');
const createRegistrationRoutes = require('./routes/registrations');
const createPoolRoutes = require('./routes/pools');
const createMatchRoutes = require('./routes/matches');
const createCourtRoutes = require('./routes/courts');
const createCheckInRoutes = require('./routes/checkin');
const createPaymentRoutes = require('./routes/payments');
const createWaiverRoutes = require('./routes/waivers');
const createExportRoutes = require('./routes/exports');
const createAuditRoutes = require('./routes/audit');
const createStaffRoutes = require('./routes/staff');
const createMessageRoutes = require('./routes/messages');

const { createAuthMiddleware } = require('./middleware/auth');

function createApp(dbPath) {
  const app = express();
  const db = getDb(dbPath);
  initializeDb(db);

  app.use(cors());
  app.use(express.json());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Public Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Auth Routes (Public)
  app.use('/api/auth', createAuthRoutes(db));

  // Protected API Routes
  app.use('/api', createAuthMiddleware(db));

  // Entity Routes
  app.use('/api/players', createPlayerRoutes(db));

  const tournamentRouter = createTournamentRoutes(db);
  app.use('/api/tournaments', tournamentRouter);

  // Nested paths for tournaments
  tournamentRouter.use('/:tournamentId/registrations', createRegistrationRoutes(db));
  tournamentRouter.use('/:tournamentId/pools', createPoolRoutes(db));
  tournamentRouter.use('/:tournamentId/matches', createMatchRoutes(db));
  tournamentRouter.use('/:tournamentId/export', createExportRoutes(db));

  // Also keep top-level for backward compatibility or direct access
  app.use('/api/registrations', createRegistrationRoutes(db));
  app.use('/api/pools', createPoolRoutes(db));
  app.use('/api/matches', createMatchRoutes(db));
  app.use('/api/courts', createCourtRoutes(db));
  app.use('/api/checkin', createCheckInRoutes(db));
  app.use('/api/payments', createPaymentRoutes(db));
  app.use('/api/waivers', createWaiverRoutes(db));
  app.use('/api/exports', createExportRoutes(db));
  app.use('/api/audit', createAuditRoutes(db));
  app.use('/api/staff', createStaffRoutes(db));
  app.use('/api/messages', createMessageRoutes(db));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

  return { app, db };
}

module.exports = { createApp };
