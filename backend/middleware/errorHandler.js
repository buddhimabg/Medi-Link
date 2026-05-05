/*Custom error class for API errors*/
class APIError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Default error values
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation Error';
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    status = 400;
    message = 'Duplicate field value entered';
  }

  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token has expired';
  }

  // Log error
  console.error({
    timestamp: new Date().toISOString(),
    status,
    message,
    path: req.path,
    method: req.method,
    error: err
  });

  // Send error response
  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? {
      status,
      stack: err.stack,
      details: err
    } : {}
  });
};

/**
 * Async error wrapper for try-catch
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 Not Found error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new APIError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

module.exports = {
  APIError,
  globalErrorHandler,
  asyncHandler,
  notFoundHandler
};