const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database Restore Script
 * Restores database from a backup file
 */

const restoreDatabase = async () => {
  try {
    // Get backup file from command line arguments
    const backupFile = process.argv[2];

    if (!backupFile) {
      console.error('\n Error: Please specify a backup file');
      console.log('Usage: npm run restore <backup-file-path>\n');
      process.exit(1);
    }

    // Check if file exists
    if (!fs.existsSync(backupFile)) {
      console.error('\n Error: Backup file not found:', backupFile);
      process.exit(1);
    }

    console.log('\n Starting database restore...\n');
    console.log(` Backup file: ${backupFile}\n`);

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-link', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(' Connected to MongoDB\n');

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    console.log('   Backup Information:');
    console.log(`   Timestamp: ${backupData.timestamp}`);
    console.log(`   Database: ${backupData.database}`);
    console.log(`   Collections: ${Object.keys(backupData.collections).length}\n`);

    // Ask for confirmation
    if (process.argv[3] !== '--confirm') {
      console.log('  Warning: This will replace all data in the current database!');
      console.log('Add --confirm flag to proceed without confirmation\n');
      console.log('Usage: npm run restore <backup-file-path> --confirm\n');
      process.exit(1);
    }

    console.log(' Restoring collections...\n');

    // Import models
    const User = require('../models/User');
    const Doctor = require('../models/Doctor');
    const Patient = require('../models/Patient');
    const Appointment = require('../models/Appointment');
    const Prescription = require('../models/Prescription');
    const Report = require('../models/Report');
    const SystemActivity = require('../models/SystemActivity');

    const models = {
      User,
      Doctor,
      Patient,
      Appointment,
      Prescription,
      Report,
      SystemActivity
    };

    // Restore each collection
    for (const [collectionName, collectionData] of Object.entries(backupData.collections)) {
      if (models[collectionName]) {
        console.log(`   Restoring ${collectionName} collection...`);

        // Clear existing collection
        await models[collectionName].deleteMany({});

        // Insert backup data
        if (collectionData.data && collectionData.data.length > 0) {
          await models[collectionName].insertMany(collectionData.data);
          console.log(`      ${collectionData.count} documents restored`);
        } else {
          console.log(`       No data to restore`);
        }
      }
    }

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   Restore Complete!               ║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Error restoring database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Run restore
restoreDatabase();