require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { createDatabase } = require('./models/database');
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
const { createApp } = require('./app');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const app = createApp();
const PORT = process.env.PORT || 3001;
const createApp = require('./app');

const PORT = process.env.PORT || 3001;
const { app } = createApp();
const http = require('http');
const { WebSocketServer } = require('ws');
const createApp = require('./app');
const { getDatabase } = require('./models/database');

const PORT = process.env.PORT || 3001;

// Initialize database
const db = getDatabase();

// Create Express app
const app = createApp(db);

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for live scoring
const wss = new WebSocketServer({ server, path: '/ws' });

// Store active connections by tournament
const tournamentClients = new Map();

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  ws.isAlive = true;
  ws.tournaments = new Set();
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'subscribe' && data.tournamentId) {
        ws.tournaments.add(data.tournamentId);
        
        if (!tournamentClients.has(data.tournamentId)) {
          tournamentClients.set(data.tournamentId, new Set());
        }
        tournamentClients.get(data.tournamentId).add(ws);
        
        ws.send(JSON.stringify({ type: 'subscribed', tournamentId: data.tournamentId }));
      }
      
      if (data.type === 'unsubscribe' && data.tournamentId) {
        ws.tournaments.delete(data.tournamentId);
        const clients = tournamentClients.get(data.tournamentId);
        if (clients) {
          clients.delete(ws);
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });
  
  ws.on('close', () => {
    // Clean up subscriptions
    ws.tournaments.forEach(tournamentId => {
      const clients = tournamentClients.get(tournamentId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          tournamentClients.delete(tournamentId);
        }
      }
    });
  });
});

// Heartbeat interval
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// Broadcast function for live updates
function broadcastToTournament(tournamentId, message) {
  const clients = tournamentClients.get(tournamentId);
  if (clients) {
    const payload = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    });
  }
}

// Make broadcast function available to routes
app.set('broadcast', broadcastToTournament);

server.listen(PORT, () => {
  console.log(`Tennis Royale server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  clearInterval(heartbeatInterval);
  wss.close();
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = { server, wss, broadcastToTournament };
const createApp = require('./app');

const PORT = process.env.PORT || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`TennisRoyale server running on port ${PORT}`);
});
