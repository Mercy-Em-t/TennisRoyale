const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { getDb } = require('./models/database');
const createTournamentRoutes = require('./routes/tournaments');
const createRegistrationRoutes = require('./routes/registrations');
const createPoolRoutes = require('./routes/pools');
const createMatchRoutes = require('./routes/matches');

// Import routes
const tournamentsRouter = require('./routes/tournaments');
const playersRouter = require('./routes/players');
const registrationsRouter = require('./routes/registrations');
const poolsRouter = require('./routes/pools');
const matchesRouter = require('./routes/matches');
const courtsRouter = require('./routes/courts');
const checkInRouter = require('./routes/checkin');
const paymentsRouter = require('./routes/payments');
const waiversRouter = require('./routes/waivers');
const exportsRouter = require('./routes/exports');
const auditRouter = require('./routes/audit');

function createApp(db) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/tournaments', tournamentsRouter(db));
  app.use('/api/players', playersRouter(db));
  app.use('/api/registrations', registrationsRouter(db));
  app.use('/api/pools', poolsRouter(db));
  app.use('/api/matches', matchesRouter(db));
  app.use('/api/courts', courtsRouter(db));
  app.use('/api/checkin', checkInRouter(db));
  app.use('/api/payments', paymentsRouter(db));
  app.use('/api/waivers', waiversRouter(db));
  app.use('/api/exports', exportsRouter(db));
  app.use('/api/audit', auditRouter(db));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  });

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

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  // Routes
  app.use('/api/tournaments', createTournamentRoutes(db));
  app.use('/api/tournaments', createRegistrationRoutes(db));
  app.use('/api/tournaments', createPoolRoutes(db));
  app.use('/api/tournaments', createMatchRoutes(db));
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

  return { app, db };
  app.db = db;
  return app;
}

module.exports = createApp;
