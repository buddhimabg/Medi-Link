const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

// Load environment variables
dotenv.config();

// Import Configuration
const { initializeDatabase, monitorDatabase } = require('./config/database');
const { initializeEnvironment } = require('./config/environment');
const corsOptions = require('./middleware/cors');

// Import Middleware
const {
  securityHeaders,
  httpsRedirect,
  removePoweredByHeader,
  validateContentType
} = require('./middleware/security');
const { sanitizeRequest } = require('./middleware/sanitizer');
const { apiLimiter } = require('./middleware/rateLimiter');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { httpRequestLogger } = require('./middleware/logger');

const app = express();

// INITIALIZE ENVIRONMENT

let config;
try {
  config = initializeEnvironment();
} catch (error) {
  console.error('Failed to initialize environment:', error.message);
  process.exit(1);
}

// MIDDLEWARE SETUP

// Security Middleware
app.use(securityHeaders);
app.use(httpsRedirect);
app.use(removePoweredByHeader);

// CORS
app.use(cors(corsOptions));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Files
app.use(express.static(path.join(__dirname, 'public')));

// HTTP Request Logging
app.use(httpRequestLogger);

// Data Sanitization
app.use(sanitizeRequest);

// Content Type Validation
app.use(validateContentType);

// Rate Limiting
app.use(apiLimiter);

// VIEW ENGINE SETUP
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DATABASE INITIALIZATION

(async () => {
  try {
    // Initialize Database
    await initializeDatabase();

    // Start Database Monitoring
    monitorDatabase(config.dbMonitorInterval);

    // IMPORT ROUTES

    const apiRoutes = require('./routes/index');

    // API ROUTES
    app.use('/api', apiRoutes);

    // VIEW ROUTES

    // Dashboard
    app.get('/', (req, res) => {
      res.render('dashboard');
    });

    // Doctors Management
    app.get('/manage-doctors', (req, res) => {
      res.render('pages/doctors');
    });

    // Patients Management
    app.get('/manage-patients', (req, res) => {
      res.render('pages/patients');
    });

    // Reports & Analytics
    app.get('/reports', (req, res) => {
      res.render('pages/reports');
    });

    // Settings
    app.get('/settings', (req, res) => {
      res.render('pages/settings');
    });

    // ERROR HANDLING MIDDLEWARE

    // 404 Not Found Handler
    app.use(notFoundHandler);

    // Global Error Handler
    app.use(globalErrorHandler);

    // START SERVER

    const PORT = config.port;
    const HOST = config.host;

    const server = app.listen(PORT, HOST, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          MEDI-LINK MEDICAL MANAGEMENT SYSTEM                   ║
║                      Server Started Successfully!              ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Server URL:     http://${HOST}:${PORT}                    
║  API Docs:       http://${HOST}:${PORT}/api/docs            
║  Health Check:   http://${HOST}:${PORT}/api/health         
║  Database:       Connected ✅                             
║  Environment:    ${config.nodeEnv}                          
║  Started:        ${new Date().toLocaleString()}             
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                      API ENDPOINTS                              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Authentication:   /api/auth                               
║  Dashboard:        /api/dashboard                           
║  Doctors:          /api/doctors                            
║  Patients:         /api/patients                            
║  Appointments:     /api/appointments                        
║  Reports:          /api/reports                            
║  System:           /api/system                             
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
      `);

      // Log startup information
      console.log('\n Server Configuration:');
      console.log('   Node Environment: ' + config.nodeEnv);
      console.log('   Port: ' + PORT);
      console.log('   API Version: ' + config.apiVersion);
      console.log('   Max File Size: ' + (config.maxFileSize / 1024 / 1024) + 'MB');
      console.log('   Log Level: ' + config.logLevel);
      console.log('   Frontend URL: ' + config.frontendUrl);
      console.log('\n Server is ready to accept requests!\n');
    });

    // GRACEFUL SHUTDOWN

    // Handle SIGTERM signal
    process.on('SIGTERM', async () => {
      console.log('\n SIGTERM signal received: closing HTTP server');
      
      server.close(async () => {
        console.log(' HTTP server closed');

        try {
          const { disconnectDB } = require('./config/database');
          await disconnectDB();
          console.log(' Database connection closed');
        } catch (error) {
          console.error(' Error disconnecting database:', error.message);
        }

        console.log(' Server shutdown complete\n');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('  Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });

    // Handle SIGINT signal (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('\n SIGINT signal received: closing HTTP server');

      server.close(async () => {
        console.log(' HTTP server closed');

        try {
          const { disconnectDB } = require('./config/database');
          await disconnectDB();
          console.log(' Database connection closed');
        } catch (error) {
          console.error(' Error disconnecting database:', error.message);
        }

        console.log(' Server shutdown complete\n');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('  Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    });

    // Handle Uncaught Exceptions
    process.on('uncaughtException', (error) => {
      console.error(' Uncaught Exception:', error);
      console.error('Stack:', error.stack);
      process.exit(1);
    });

    // Handle Unhandled Promise Rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error(' Unhandled Rejection at:', promise, 'reason:', reason);
    });

    // EXPORT APP FOR TESTING
    module.exports = app;

  } catch (error) {
    console.error('\n FATAL ERROR - Failed to start server:');
    console.error('   Message:', error.message);
    console.error('   Stack:', error.stack);
    console.error('\n Server initialization failed\n');
    process.exit(1);
  }
})();