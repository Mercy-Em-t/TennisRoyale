const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { generateToken, authenticate } = require('../middleware/auth');

function createAuthRoutes(db) {
  const router = express.Router();

  // POST /api/auth/signup
  router.post('/signup', async (req, res) => {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      const userRole = (role === 'host' || role === 'admin' || role === 'referee') ? role : 'player';

      // Check if email exists in users
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      // Start transaction
      const signupTransaction = db.transaction(() => {
        // Insert into users for auth
        db.prepare(
          'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, name, email, hashedPassword, userRole);

        // Also insert into players for profile
        db.prepare(
          'INSERT INTO players (id, user_id, name, email) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), userId, name, email);
      });

      signupTransaction();

      res.status(201).json({
        user: { id: userId, email, name, role: userRole },
        token: generateToken({ id: userId, email, role: userRole })
      });
    } catch (err) {
      console.error('Signup error:', err);
      res.status(500).json({ error: 'Failed to create account', message: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role, name: user.name });

      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed', message: err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', authenticate, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: req.user });
  });

  return router;
}

module.exports = createAuthRoutes;
