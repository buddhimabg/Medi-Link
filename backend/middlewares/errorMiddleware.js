// mood-backend/middlewares/errorMiddleware.js

const { apiFail } = require("../utils/apiResponse.js");

/**
 * Enhanced error middleware with proper status codes and logging
 * Returns consistent error response format
 */
const errorHandler = (err, req, res, next) => {
  // Log detailed error (don't expose stack trace to client)
  console.error("[ERROR]", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Determine status code
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Mongoose validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(statusCode).json(apiFail(message, details));
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    message = "Duplicate entry";
  }

  // JWT errors (if auth is added later)
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  // Return standardized error
  res.status(statusCode).json(apiFail(message));
};

/**
 * Async handler wrapper to catch promise rejections
 * Usage: router.get("/path", asyncHandler(controllerFunction))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
};