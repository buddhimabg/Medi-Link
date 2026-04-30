// mood-backend/utils/apiResponse.js

/**
 * Standardized API response wrapper
 * Ensures all endpoints return consistent format
 */

const successResponse = (data, message = "Success", statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data
  };
};

const errorResponse = (statusCode, message, details = null) => {
  const response = {
    success: false,
    statusCode,
    message
  };
  
  if (details) {
    response.details = details; // For validation errors, include field-level details
  }
  
  return response;
};

/**
 * Response helper for controller use
 * Usage: res.status(201).json(apiSuccess(data, msg))
 */
const apiSuccess = (data, message = "Success") => {
  return {
    success: true,
    message,
    data
  };
};

/**
 * Response helper for error middleware
 * Usage: res.status(400).json(apiFail(message))
 */
const apiFail = (message, details = null) => {
  const response = {
    success: false,
    message
  };
  
  if (details) {
    response.details = details;
  }
  
  return response;
};

module.exports = {
  successResponse,
  errorResponse,
  apiSuccess,
  apiFail
};