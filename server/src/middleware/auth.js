// Auth middleware - identifies current user from Authorization header
// Uses a simple token scheme: "Bearer <userId>"
// In production, this would be replaced with JWT or session-based auth.

function authMiddleware(db) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const userId = authHeader.slice(7);
    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(userId);
    req.user = user || null;
    next();
  };
}

// Require authenticated user
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Require specific role(s)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireAuth, requireRole };
