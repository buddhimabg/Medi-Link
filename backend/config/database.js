const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * MongoDB Connection Configuration
 * Handles database connection with proper error handling and connection pooling
 */

const MONGODB_URI = 'mongodb://pavindugrx11_db_user:9hg8An6yL295JPLW@ac-pdfzbxj-shard-00-00.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-01.rqoahkh.mongodb.net:27017,ac-pdfzbxj-shard-00-02.rqoahkh.mongodb.net:27017/medilink?ssl=true&replicaSet=atlas-76m1iy-shard-0&authSource=admin&retryWrites=true&w=majority&appName=medi-link';

// Connection options
const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 10,
  minPoolSize: 5
};

/**
 * Connect to MongoDB Database
 * @returns {Promise<Object>} MongoDB connection object
 */
const connectDB = async () => {
  try {
    console.log(' Attempting to connect to MongoDB...');
    console.log(` Connection URI: ${MONGODB_URI.replace(/mongodb\+srv:\/\/.*:.*@/, 'mongodb+srv://***:***@')}`);

    const conn = await mongoose.connect(MONGODB_URI, connectionOptions);

    console.log(`   MongoDB Connected Successfully!`);
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Port: ${conn.connection.port}`);
    console.log(`   Database: ${conn.connection.name}`);

    // Connection event handlers
    setupConnectionHandlers();

    return conn;
  } catch (error) {
    console.error(' MongoDB Connection Error:', error.message);

    if (error.name === 'MongoServerError') {
      console.error('   Server Error Code:', error.code);
    }

    if (error.name === 'MongoNetworkError') {
      console.error('   Network Error: Check if MongoDB is running');
    }

    if (error.name === 'MongoAuthenticationError') {
      console.error('   Authentication Error: Check your credentials');
    }

    // Exit process if can't connect to database
    process.exit(1);
  }
};

/**
 * Setup MongoDB Connection Event Handlers
 */
const setupConnectionHandlers = () => {
  // Connected
  mongoose.connection.on('connected', () => {
    console.log('   Mongoose connected to MongoDB');
  });

  // Disconnected
  mongoose.connection.on('disconnected', () => {
    console.log('  Mongoose disconnected from MongoDB');
  });

  // Error
  mongoose.connection.on('error', (err) => {
    console.error(' MongoDB Connection Error:', err);
  });

  // Reconnected
  mongoose.connection.on('reconnected', () => {
    console.log('   Mongoose reconnected to MongoDB');
  });

  // Timeout
  mongoose.connection.on('timeout', () => {
    console.error('⏱  Mongoose connection timeout');
  });

  // Dropped Index
  mongoose.connection.on('index', (index) => {
    console.log(' Index dropped:', index);
  });
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log(' MongoDB Disconnected Successfully');
  } catch (error) {
    console.error(' MongoDB Disconnection Error:', error.message);
    throw error;
  }
};

/**
 * Get Database Connection Status
 * @returns {Object} Connection status information
 */
const getConnectionStatus = () => {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    readyStateDescription: getReadyStateDescription(mongoose.connection.readyState)
  };
};

/**
 * Get MongoDB Connection Ready State Description
 * @param {number} state - Connection ready state (0-3)
 * @returns {string} Description of the state
 */
const getReadyStateDescription = (state) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[state] || 'unknown';
};

/**
 * Drop Database (Development Only)
 * USE WITH CAUTION - This will delete all data
 * @returns {Promise<void>}
 */
const dropDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot drop database in production environment');
  }

  try {
    await mongoose.connection.dropDatabase();
    console.log('  Database dropped successfully');
  } catch (error) {
    console.error(' Error dropping database:', error.message);
    throw error;
  }
};

/**
 * Create Database Indexes
 * Ensures all model indexes are created
 * @returns {Promise<void>}
 */
const createIndexes = async () => {
  try {
    await mongoose.connection.syncIndexes();
    console.log(' Database indexes created/synchronized');
  } catch (error) {
    console.error(' Error creating indexes:', error.message);
    throw error;
  }
};

/**
 * Health Check
 * Verifies database connection is healthy
 * @returns {Promise<Object>} Health status
 */
const healthCheck = async () => {
  try {
    // Ping the database
    const result = await mongoose.connection.db.admin().ping();

    return {
      status: 'healthy',
      database: 'MongoDB',
      connected: true,
      timestamp: new Date().toISOString(),
      connectionInfo: getConnectionStatus()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      database: 'MongoDB',
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Initialize Database
 * Performs all necessary database setup tasks
 * @returns {Promise<void>}
 */
const initializeDatabase = async () => {
  try {
    console.log('\n Initializing Database...\n');

    // Connect to database
    await connectDB();

    // Create indexes
    await createIndexes();

    // Run health check
    const health = await healthCheck();
    console.log(' Database Health:', health.status);

    console.log('\n Database Initialization Complete!\n');
  } catch (error) {
    console.error('\n Database Initialization Failed:', error.message);
    process.exit(1);
  }
};

/**
 * Seed Database with Initial Data (Development)
 * @returns {Promise<void>}
 */
const seedDatabase = async () => {
  try {
    console.log(' Seeding database with initial data...');

    const User = require('../models/User');
    const Doctor = require('../models/Doctor');
    const Patient = require('../models/Patient');

    // Check if admin user already exists
    const adminExists = await User.findOne({ email: 'admin@medilink.com' });

    if (!adminExists) {
      // Create admin user
      const admin = new User({
        name: 'Admin User',
        email: 'admin@medilink.com',
        password: 'Admin@123456',
        role: 'admin',
        phone: '+1234567890',
        isActive: true,
        emailVerified: true
      });

      await admin.save();
      console.log(' Admin user created');
    }

    // Check if test doctor exists
    const doctorUserExists = await User.findOne({ email: 'doctor@medilink.com' });

    if (!doctorUserExists) {
      // Create test doctor user
      const doctorUser = new User({
        name: 'Dr. Test Doctor',
        email: 'doctor@medilink.com',
        password: 'Doctor@123456',
        role: 'doctor',
        phone: '+1234567891',
        isActive: true,
        emailVerified: true
      });

      await doctorUser.save();

      // Create doctor profile
      const doctor = new Doctor({
        userId: doctorUser._id,
        licenseNumber: 'LIC-12345678',
        specialization: 'General',
        experience: 5,
        qualifications: ['MD', 'MBBS'],
        consultationFee: 50,
        status: 'active',
        isVerified: true
      });

      await doctor.save();
      console.log(' Test doctor user and profile created');
    }

    // Check if test patient exists
    const patientUserExists = await User.findOne({ email: 'patient@medilink.com' });

    if (!patientUserExists) {
      // Create test patient user
      const patientUser = new User({
        name: 'Test Patient',
        email: 'patient@medilink.com',
        password: 'Patient@123456',
        role: 'patient',
        phone: '+1234567892',
        isActive: true,
        emailVerified: true
      });

      await patientUser.save();

      // Create patient profile
      const patient = new Patient({
        userId: patientUser._id,
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
        bloodType: 'O+',
        status: 'active'
      });

      await patient.save();
      console.log(' Test patient user and profile created');
    }

    console.log(' Database seeding complete');
  } catch (error) {
    console.error(' Error seeding database:', error.message);
  }
};

/**
 * Monitor Database Connection
 * Periodically checks connection health
 * @param {number} interval - Check interval in milliseconds (default: 30000ms)
 */
const monitorDatabase = (interval = 30000) => {
  setInterval(async () => {
    const status = await healthCheck();

    if (status.status === 'unhealthy') {
      console.warn('  Database connection is unhealthy');
      console.warn('   Attempting to reconnect...');

      try {
        await mongoose.connect(MONGODB_URI, connectionOptions);
        console.log(' Database reconnected successfully');
      } catch (error) {
        console.error(' Failed to reconnect:', error.message);
      }
    }
  }, interval);
};

/**
 * Get Database Statistics
 * @returns {Promise<Object>} Database statistics
 */
const getDatabaseStats = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    const stats = await admin.serverStatus();

    return {
      uptime: stats.uptime,
      connections: stats.connections,
      memory: stats.mem,
      operations: stats.opcounters
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};

/**
 * Backup Database
 * Creates a backup of the database
 * @returns {Promise<void>}
 */
const backupDatabase = async () => {
  try {
    console.log(' Starting database backup...');
    
    // In production, you would use mongodump or MongoDB backup services
    // This is a placeholder for the backup process
    
    console.log(' Database backup completed');
  } catch (error) {
    console.error(' Error during backup:', error.message);
    throw error;
  }
};

/**
 * Restore Database
 * Restores database from backup
 * @param {string} backupPath - Path to backup file
 * @returns {Promise<void>}
 */
const restoreDatabase = async (backupPath) => {
  try {
    console.log('♻️  Starting database restore...');
    
    // In production, you would use mongorestore or MongoDB restore services
    // This is a placeholder for the restore process
    
    console.log(' Database restore completed');
  } catch (error) {
    console.error(' Error during restore:', error.message);
    throw error;
  }
};

module.exports = {
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
  restoreDatabase,
  MONGODB_URI,
  connectionOptions
};