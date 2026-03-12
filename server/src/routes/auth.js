const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { generateToken } = require('../middleware/auth');

function createAuthRouter(db) {
  const router = express.Router();

  // POST /api/auth/signup
  router.post('/signup', async (req, res) => {
    try {
      const { email, password, name, role } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      const userRole = role === 'host' ? 'host' : 'player';

      // Check if email exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      const profileId = crypto.randomUUID();

      const insertUser = db.prepare(
        'INSERT INTO users (id, email, password, name, role) VALUES (?, ?, ?, ?, ?)'
      );
      const insertPlayerProfile = db.prepare(
        'INSERT INTO player_profiles (id, user_id) VALUES (?, ?)'
      );
      const insertHostProfile = db.prepare(
        'INSERT INTO host_profiles (id, user_id) VALUES (?, ?)'
      );

      const transaction = db.transaction(() => {
        insertUser.run(userId, email, hashedPassword, name, userRole);
        // Always create player profile
        insertPlayerProfile.run(profileId, userId);
        // Also create host profile if host
        if (userRole === 'host') {
          insertHostProfile.run(crypto.randomUUID(), userId);
        }
      });

      transaction();

      const user = { id: userId, email, name, role: userRole };
      const token = generateToken(user);

      res.status(201).json({ user, token });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create account' });
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

      const token = generateToken(user);
      const { password: _, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword, token });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  return router;
}

module.exports = createAuthRouter;
