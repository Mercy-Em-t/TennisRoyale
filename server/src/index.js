const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');
const registrationRoutes = require('./routes/registrations');
const poolRoutes = require('./routes/pools');
const matchRoutes = require('./routes/matches');
const bracketRoutes = require('./routes/brackets');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Strict rate limit for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TennisRoyale API', timestamp: new Date().toISOString() });
});

// Auth (stricter limit)
app.use('/api/auth', authLimiter, authRoutes);

// All other API routes
app.use('/api/tournaments', apiLimiter, tournamentRoutes);
app.use('/api/tournaments/:id/registrations', apiLimiter, registrationRoutes);
app.use('/api/tournaments/:id/pools', apiLimiter, poolRoutes);
app.use('/api/tournaments/:id/matches', apiLimiter, matchRoutes);
app.use('/api/tournaments/:id/bracket', apiLimiter, bracketRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`TennisRoyale API running on port ${PORT}`);
});

module.exports = app;
