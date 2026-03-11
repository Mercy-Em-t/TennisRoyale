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
