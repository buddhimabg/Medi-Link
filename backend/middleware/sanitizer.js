/**
 * Sanitize request data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const sanitizeRequest = (req, res, next) => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Prevent NoSQL injection: strip keys starting with $
        if (key.startsWith('$')) continue;
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

/**
 * Sanitize string
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeString = (str) => {
  // Remove script tags (XSS prevention)
  str = str.replace(/<script[^>]*>.*?<\/script>/gi, '');

  // Remove HTML tags
  str = str.replace(/<[^>]*>/g, '');

  // Prevent NoSQL injection by removing $ at start of keys
  // (handled at object level, not string level)

  // Trim whitespace
  str = str.trim();

  return str;
};

module.exports = {
  sanitizeRequest,
  sanitizeObject,
  sanitizeString
};