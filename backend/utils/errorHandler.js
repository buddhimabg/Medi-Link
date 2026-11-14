/**
 * Custom Error Classes for API Responses
 */

/**
 * Base API Error Class
 */
class APIError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'APIError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      status: this.status,
      code: this.code
    };
  }
}

/**
 * Validation Error (400)
 */
class ValidationError extends APIError {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

/**
 * Authentication Error (401)
 */
class AuthenticationError extends APIError {
  constructor(message = 'Authentication Failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error (403)
 */
class AuthorizationError extends APIError {
  constructor(message = 'Access Denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends APIError {
  constructor(resource = 'Resource', message = null) {
    super(
      message || `${resource} not found`,
      404,
      'NOT_FOUND'
    );
    this.resource = resource;
  }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends APIError {
  constructor(message = 'Resource Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Duplicate Error (409)
 */
class DuplicateError extends APIError {
  constructor(field = 'Field', value = null) {
    super(
      `${field} '${value}' already exists`,
      409,
      'DUPLICATE_ENTRY'
    );
  }
}

/**
 * Rate Limit Error (429)
 */
class RateLimitError extends APIError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends APIError {
  constructor(message = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * Database Error
 */
class DatabaseError extends APIError {
  constructor(message = 'Database Error', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * File Upload Error
 */
class FileUploadError extends APIError {
  constructor(message = 'File Upload Failed') {
    super(message, 400, 'FILE_UPLOAD_ERROR');
  }
}

/**
 * External Service Error
 */
class ExternalServiceError extends APIError {
  constructor(service = 'Service', message = 'External Service Error') {
    super(message, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Validation Error Factory
 */
function createValidationError(errors) {
  const formattedErrors = errors.map(error => ({
    field: error.param || error.path,
    message: error.msg || error.message,
    value: error.value
  }));

  return new ValidationError('Validation Failed', formattedErrors);
}

/**
 * Database Error Handler
 */
function handleDatabaseError(error) {
  if (error.name === 'ValidationError') {
    const message = Object.values(error.errors)
      .map(e => e.message)
      .join(', ');
    return new ValidationError('Database Validation Error', [{ message }]);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return new DuplicateError(field, error.keyValue[field]);
  }

  if (error.name === 'CastError') {
    return new ValidationError('Invalid ID format');
  }

  return new DatabaseError('Database operation failed', error);
}

module.exports = {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DuplicateError,
  RateLimitError,
  InternalServerError,
  DatabaseError,
  FileUploadError,
  ExternalServiceError,
  createValidationError,
  handleDatabaseError
};