const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database Cleanup Script
 * Removes old data and optimizes database
 */

const cleanupDatabase = async () => {
  try {
    console.log('\n Starting database cleanup...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-link', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(' Connected to MongoDB\n');

    // Import models
    const SystemActivity = require('../models/SystemActivity');
    const Appointment = require('../models/Appointment');

    console.log('🔧 Running cleanup tasks...\n');

    // Cleanup 1: Remove old system activities (older than 90 days)
    console.log(' Cleanup 1: Removing old system activities...');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const activitiesDeleteResult = await SystemActivity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`    Deleted ${activitiesDeleteResult.deletedCount} old activities\n`);

    // Cleanup 2: Remove cancelled appointments older than 1 year
    console.log(' Cleanup 2: Removing old cancelled appointments...');
    const appointmentCutoffDate = new Date();
    appointmentCutoffDate.setFullYear(appointmentCutoffDate.getFullYear() - 1);

    const appointmentsDeleteResult = await Appointment.deleteMany({
      status: 'cancelled',
      createdAt: { $lt: appointmentCutoffDate }
    });

    console.log(`    Deleted ${appointmentsDeleteResult.deletedCount} old cancelled appointments\n`);

    // Cleanup 3: Compact collections
    console.log(' Cleanup 3: Compacting collections...');
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      try {
        await db.command({ compact: collection.name });
        console.log(`    Compacted ${collection.name} collection`);
      } catch (error) {
        console.log(`     Could not compact ${collection.name} (not critical)`);
      }
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Cleanup Complete!               ║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Error during cleanup:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Run cleanup
cleanupDatabase();