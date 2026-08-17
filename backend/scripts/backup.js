const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database Backup Script
 * Creates a backup of the database
 */

const backupDatabase = async () => {
  try {
    console.log('\n Starting database backup...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-link', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(' Connected to MongoDB\n');

    // Create backups directory if it doesn't exist
    const backupsDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Import models
    const User = require('../models/User');
    const Doctor = require('../models/Doctor');
    const Patient = require('../models/Patient');
    const Appointment = require('../models/Appointment');
    const Prescription = require('../models/Prescription');
    const Report = require('../models/Report');
    const SystemActivity = require('../models/SystemActivity');

    // Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      database: process.env.MONGODB_URI || 'medi-link',
      collections: {}
    };

    console.log(' Backing up collections...\n');

    // Backup each collection
    const collections = [
      { name: 'User', model: User },
      { name: 'Doctor', model: Doctor },
      { name: 'Patient', model: Patient },
      { name: 'Appointment', model: Appointment },
      { name: 'Prescription', model: Prescription },
      { name: 'Report', model: Report },
      { name: 'SystemActivity', model: SystemActivity }
    ];

    for (const collection of collections) {
      console.log(`   Backing up ${collection.name} collection...`);
      const data = await collection.model.find({}).lean();
      backup.collections[collection.name] = {
        count: data.length,
        data
      };
      console.log(`      ${data.length} documents backed up`);
    }

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));

    console.log(`\n Backup saved to: ${backupFilePath}\n`);

    // Create backup info
    const backupSize = fs.statSync(backupFilePath).size;
    const backupSizeMB = (backupSize / 1024 / 1024).toFixed(2);

    console.log('╔════════════════════════════════════════╗');
    console.log('║    Backup Complete!                 ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  File: ${backupFileName.padEnd(33)}║`);
    console.log(`║  Size: ${backupSizeMB} MB${' '.repeat(Math.max(0, 31 - backupSizeMB.length))}║`);
    console.log(`║  Location: ${path.relative(process.cwd(), backupFilePath).padEnd(24)}║`);
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Error backing up database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Run backup
backupDatabase();