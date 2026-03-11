const express = require('express');
const cors = require('cors');

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TennisRoyale API', timestamp: new Date().toISOString() });
});

// Auth
app.use('/api/auth', authRoutes);

// Tournaments (includes status transitions and export)
app.use('/api/tournaments', tournamentRoutes);

// Nested tournament resources
app.use('/api/tournaments/:id/registrations', registrationRoutes);
app.use('/api/tournaments/:id/pools', poolRoutes);
app.use('/api/tournaments/:id/matches', matchRoutes);
app.use('/api/tournaments/:id/bracket', bracketRoutes);

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
