const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    // Attach user info to request
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token'
      });
    }

    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Check if user is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdmin = (req, res, next) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required'
    });
  }
  next();
};

/**
 * Check if user is doctor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isDoctor = (req, res, next) => {
  if (req.userRole !== 'doctor' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Doctor privileges required'
    });
  }
  next();
};

/**
 * Check if user is patient
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isPatient = (req, res, next) => {
  if (req.userRole !== 'patient' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Patient privileges required'
    });
  }
  next();
};

/**
 * Check if user is receptionist or admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isReceptionist = (req, res, next) => {
  if (req.userRole !== 'receptionist' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Receptionist privileges required'
    });
  }
  next();
};

/**
 * Check if user owns the resource or is admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isOwnerOrAdmin = (req, res, next) => {
  const resourceUserId = req.params.userId || req.body.userId;

  if (req.userId.toString() !== resourceUserId && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources'
    });
  }
  next();
};

/**
 * Verify user is active
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    next();
  } catch (error) {
    console.error('User verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying user status'
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin,
  isDoctor,
  isPatient,
  isReceptionist,
  isOwnerOrAdmin,
  verifyUserActive
};