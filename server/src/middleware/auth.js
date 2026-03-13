const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Middleware to authenticate requests using JWT
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = null;
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to require a specific role or roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
    }
    next();
  };
}

/**
 * Simple middleware for identifying user from a DB if needed
 */
function createAuthMiddleware(db) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    try {
      // Try JWT first
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(decoded.id);
      req.user = user || null;
      next();
    } catch (err) {
      // Fallback or handle invalid token
      req.user = null;
      next();
    }
  };
}

module.exports = {
  generateToken,
  authenticate,
  requireRole,
  createAuthMiddleware,
  JWT_SECRET
};
