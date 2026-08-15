const helmet = require('helmet');

/**
 * Security headers middleware configuration
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

/**
 * HTTPS redirect middleware
 */
const httpsRedirect = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect('https://' + req.get('host') + req.url);
  }
  next();
};

/**
 * Remove powered by header
 */
const removePoweredByHeader = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * Content type validation middleware
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    
    if (!contentType) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type header is required'
      });
    }

    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];

    const isAllowed = allowedTypes.some(type => contentType.includes(type));

    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported Content-Type. Allowed: application/json, multipart/form-data, application/x-www-form-urlencoded'
      });
    }
  }
  next();
};

module.exports = {
  securityHeaders,
  httpsRedirect,
  removePoweredByHeader,
  validateContentType
};