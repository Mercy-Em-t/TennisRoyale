const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken } = require('../auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO hosts (username, password_hash) VALUES (?, ?)');
    const result = stmt.run(username, passwordHash);
    const token = generateToken({ id: result.lastInsertRowid, username });
    res.status(201).json({ id: result.lastInsertRowid, username, token });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const host = db.prepare('SELECT * FROM hosts WHERE username = ?').get(username);
  if (!host) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, host.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken({ id: host.id, username: host.username });
  res.json({ id: host.id, username: host.username, token });
});

module.exports = router;
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

function createAuthRoutes(db) {
  const router = express.Router();

  // Register a new user
  router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const validRoles = ['host', 'player', 'referee'];
    const userRole = validRoles.includes(role) ? role : 'player';

    // Check for existing user
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    db.prepare(
      'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, email, passwordHash, userRole);

    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ user, token: id });
  });

  // Login
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, created_at: user.created_at },
      token: user.id
    });
  });

  // Get current user
  router.get('/me', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.user });
  });

  return router;
}

module.exports = createAuthRoutes;
