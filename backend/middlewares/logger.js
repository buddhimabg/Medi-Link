const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels
 */
const LogLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Get current timestamp
 * @returns {string} Formatted timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Format log message
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 * @returns {string} Formatted log message
 */
const formatLog = (level, message, data = {}) => {
  return JSON.stringify({
    timestamp: getTimestamp(),
    level,
    message,
    ...data
  });
};

/**
 * Write log to file
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
const writeLog = (level, message, data = {}) => {
  const logMessage = formatLog(level, message, data);

  // Write to combined log
  const combinedLogPath = path.join(logsDir, 'combined.log');
  fs.appendFileSync(combinedLogPath, logMessage + '\n');

  // Write error logs to separate file
  if (level === LogLevels.ERROR) {
    const errorLogPath = path.join(logsDir, 'error.log');
    fs.appendFileSync(errorLogPath, logMessage + '\n');
  }
};

/**
 * Logger object with methods for different log levels
 */
const logger = {
  error: (message, data) => {
    console.error(`[ERROR] ${message}`, data);
    writeLog(LogLevels.ERROR, message, data);
  },

  warn: (message, data) => {
    console.warn(`[WARN] ${message}`, data);
    writeLog(LogLevels.WARN, message, data);
  },

  info: (message, data) => {
    console.log(`[INFO] ${message}`, data);
    writeLog(LogLevels.INFO, message, data);
  },

  debug: (message, data) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data);
      writeLog(LogLevels.DEBUG, message, data);
    }
  }
};

/**
 * HTTP request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const httpRequestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info(`Incoming ${req.method} request`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? LogLevels.WARN : LogLevels.INFO;

    logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
};

/**
 * Database operation logger
 * @param {string} operation - Database operation (create, read, update, delete)
 * @param {string} collection - Collection name
 * @param {Object} data - Operation data
 */
const logDatabaseOperation = (operation, collection, data = {}) => {
  logger.debug(`Database ${operation}`, {
    collection,
    operation,
    data: process.env.NODE_ENV === 'development' ? data : {}
  });
};

/**
 * Authentication logger
 * @param {string} action - Authentication action
 * @param {string} email - User email
 * @param {Object} data - Additional data
 */
const logAuthAction = (action, email, data = {}) => {
  logger.info(`Authentication: ${action}`, {
    email,
    action,
    ...data
  });
};

/**
 * User action logger
 * @param {string} action - User action
 * @param {string} userId - User ID
 * @param {Object} data - Additional data
 */
const logUserAction = (action, userId, data = {}) => {
  logger.info(`User action: ${action}`, {
    userId,
    action,
    ...data
  });
};

module.exports = {
  logger,
  httpRequestLogger,
  logDatabaseOperation,
  logAuthAction,
  logUserAction,
  LogLevels
};