const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * 15 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later'
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint or in development mode
    return req.path === '/api/health' || process.env.NODE_ENV === 'development';
  }
});

/**
 * Login rate limiter
 * 5 requests per 15 minutes
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later'
    });
  }
});

/**
 * Registration rate limiter
 * 3 requests per 1 hour
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: 'Too many accounts created from this IP, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many registration attempts, please try again later'
    });
  }
});

/**
 * Password reset rate limiter
 * 3 requests per 1 hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per windowMs
  message: 'Too many password reset requests, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts, please try again later'
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per 1 hour
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per windowMs
  message: 'Too many requests to this endpoint, please try again later.',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded, please try again later'
    });
  }
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  strictLimiter
};