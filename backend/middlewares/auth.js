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
    // Also set the flat req.userId/req.userRole convention used by the
    // admin-dashboard controllers (doctor/patient/report/system), which
    // were written against a separate auth middleware before this merge.
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Alias kept for the admin-dashboard routes, which were written against
// this name before being merged onto this shared middleware.
const verifyToken = protect;

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

const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required' });
  }
  next();
};

const isDoctor = (req, res, next) => {
  if (req.userRole !== 'doctor' && req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Doctor privileges required' });
  }
  next();
};

const isPatient = (req, res, next) => {
  if (req.userRole !== 'patient' && req.userRole !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Patient privileges required' });
  }
  next();
};

module.exports = { protect, requireRole, verifyToken, isAdmin, isDoctor, isPatient };