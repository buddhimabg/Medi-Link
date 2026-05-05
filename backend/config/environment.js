const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Environment Configuration Validation
 */

// Define required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'MONGODB_URI'
];

// Optional environment variables with defaults
const optionalEnvVars = {
  JWT_SECRET: 'your_jwt_secret_key_change_in_production',
  JWT_EXPIRE: '7d',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  UPLOAD_PATH: './uploads',
  API_VERSION: 'v1',
  API_PREFIX: '/api',
  DB_MONITOR_INTERVAL: 30000,
  LOG_LEVEL: 'debug',
  FRONTEND_URL: 'http://localhost:5173',
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 587,
  SMTP_USER: '',
  SMTP_PASS: '',
  AWS_ACCESS_KEY_ID: '',
  AWS_SECRET_ACCESS_KEY: '',
  AWS_REGION: 'us-east-1',
  AWS_S3_BUCKET: ''
};

/**
 * Validate Environment Variables
 */
const validateEnvironment = () => {
  const missingVars = [];

  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file.'
    );
  }

  // Validate specific values
  const validNodeEnvs = ['development', 'production', 'testing'];
  if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
    throw new Error(
      `Invalid NODE_ENV: ${process.env.NODE_ENV}\n` +
      `Must be one of: ${validNodeEnvs.join(', ')}`
    );
  }

  // Validate PORT
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT: ${process.env.PORT}\n` +
      'PORT must be a number between 1 and 65535'
    );
  }

  console.log(' Environment variables validated successfully');
};

/**
 * Get Environment Configuration
 * @returns {Object} Environment configuration object
 */
const getConfig = () => {
  return {
    // Node Environment
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTesting: process.env.NODE_ENV === 'testing',

    // Server
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',

    // Database
    mongodbUri: process.env.MONGODB_URI,

    // JWT
    jwtSecret: process.env.JWT_SECRET || optionalEnvVars.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || optionalEnvVars.JWT_EXPIRE,

    // File Upload
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || optionalEnvVars.MAX_FILE_SIZE,
    uploadPath: process.env.UPLOAD_PATH || optionalEnvVars.UPLOAD_PATH,

    // API
    apiVersion: process.env.API_VERSION || optionalEnvVars.API_VERSION,
    apiPrefix: process.env.API_PREFIX || optionalEnvVars.API_PREFIX,

    // Database Monitoring
    dbMonitorInterval: parseInt(process.env.DB_MONITOR_INTERVAL) || optionalEnvVars.DB_MONITOR_INTERVAL,

    // Logging
    logLevel: process.env.LOG_LEVEL || optionalEnvVars.LOG_LEVEL,

    // Frontend
    frontendUrl: process.env.FRONTEND_URL || optionalEnvVars.FRONTEND_URL,

    // Email Configuration
    smtp: {
      host: process.env.SMTP_HOST || optionalEnvVars.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || optionalEnvVars.SMTP_PORT,
      user: process.env.SMTP_USER || optionalEnvVars.SMTP_USER,
      pass: process.env.SMTP_PASS || optionalEnvVars.SMTP_PASS,
      from: process.env.SMTP_FROM || 'noreply@medilink.com'
    },

    // AWS Configuration
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || optionalEnvVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || optionalEnvVars.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || optionalEnvVars.AWS_REGION,
      s3Bucket: process.env.AWS_S3_BUCKET || optionalEnvVars.AWS_S3_BUCKET
    }
  };
};

/**
 * Print Environment Information
 */
const printEnvironmentInfo = () => {
  const config = getConfig();

  console.log(`
╔═══════════════════════════════════════════════════════╗
║         Environment Configuration                     ║
╠═══════════════════════════════════════════════════════╣
║ Environment: ${config.nodeEnv.padEnd(43)}             ║
║ Port: ${config.port.toString().padEnd(46)}            ║
║ Database: ${(config.mongodbUri.substring(0, 40) + '...').padEnd(44)}║
║ Frontend URL: ${config.frontendUrl.padEnd(41)}        ║
╚═══════════════════════════════════════════════════════╝
  `);
};

/**
 * Initialize Environment Configuration
 * @returns {Object} Configuration object
 */
const initializeEnvironment = () => {
  try {
    validateEnvironment();
    const config = getConfig();
    
    if (config.isDevelopment) {
      printEnvironmentInfo();
    }

    return config;
  } catch (error) {
    console.error(' Environment Configuration Error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  validateEnvironment,
  getConfig,
  printEnvironmentInfo,
  initializeEnvironment,
  requiredEnvVars,
  optionalEnvVars
};