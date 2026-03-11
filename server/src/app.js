const express = require('express');
const cors = require('cors');

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

  return app;
}

module.exports = createApp;
