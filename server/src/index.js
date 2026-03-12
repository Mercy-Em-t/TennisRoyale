require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { createDatabase } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = createDatabase();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

// Routes
const createAuthRouter = require('./routes/auth');
const createTournamentRouter = require('./routes/tournaments');
const createPaymentRouter = require('./routes/payments');
const createHostRouter = require('./routes/host');
const createPlayerRouter = require('./routes/player');
const createRefundRouter = require('./routes/refunds');
const createAdminRouter = require('./routes/admin');

app.use('/api/auth', createAuthRouter(db));
app.use('/api/tournaments', createTournamentRouter(db));
app.use('/api/payments', createPaymentRouter(db));
app.use('/api/host', createHostRouter(db));
app.use('/api/player', createPlayerRouter(db));
app.use('/api/refunds', createRefundRouter(db));
app.use('/api/admin', createAdminRouter(db));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { app, db };
