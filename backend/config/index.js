/**
 * Configuration Index
 * Exports all configuration modules
 */

const { 
  connectDB, 
  disconnectDB, 
  getConnectionStatus, 
  dropDatabase, 
  createIndexes, 
  healthCheck, 
  initializeDatabase, 
  seedDatabase, 
  monitorDatabase,
  getDatabaseStats,
  backupDatabase,
  restoreDatabase
} = require('./database');

const { 
  validateEnvironment, 
  getConfig, 
  printEnvironmentInfo, 
  initializeEnvironment 
} = require('./environment');

module.exports = {
  // Database Configuration
  database: {
    connectDB,
    disconnectDB,
    getConnectionStatus,
    dropDatabase,
    createIndexes,
    healthCheck,
    initializeDatabase,
    seedDatabase,
    monitorDatabase,
    getDatabaseStats,
    backupDatabase,
    restoreDatabase
  },

  // Environment Configuration
  environment: {
    validateEnvironment,
    getConfig,
    printEnvironmentInfo,
    initializeEnvironment
  },

  // Shortcuts
  connectDB,
  disconnectDB,
  initializeDatabase,
  getConfig,
  initializeEnvironment
};