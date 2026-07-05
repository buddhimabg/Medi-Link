// src/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Verifies the Bearer JWT from the Authorization header.
 * Attaches decoded payload to req.user.
 * Used by all protected video-call routes.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided. Access denied.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medilink_secret');
    req.user = decoded;   // { id, role, name, ... }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Restricts access to specific roles.
 * Usage: router.post('/route', protect, requireRole('doctor'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

module.exports = { protect, requireRole };