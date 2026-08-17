const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

/**
 * Database Migration Script
 * Performs database schema migrations and updates
 */

const migrateDatabase = async () => {
  try {
    console.log('\n Starting database migration...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-link', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(' Connected to MongoDB\n');

    // Import models
    const User = require('../models/User');
    const Doctor = require('../models/Doctor');
    const Patient = require('../models/Patient');
    const Appointment = require('../models/Appointment');

    console.log(' Running migrations...\n');

    // Migration 1: Add missing fields to existing users
    console.log(' Migration 1: Adding missing fields to users...');
    const usersUpdateResult = await User.updateMany(
      {
        isActive: { $exists: false }
      },
      {
        $set: {
          isActive: true,
          twoFactorEnabled: false,
          autoLogoutEnabled: true
        }
      }
    );
    console.log(`    Updated ${usersUpdateResult.modifiedCount} users\n`);

    // Migration 2: Update doctor profiles with default values
    console.log(' Migration 2: Updating doctor profiles...');
    const doctorsUpdateResult = await Doctor.updateMany(
      {
        rating: { $exists: false }
      },
      {
        $set: {
          rating: 0,
          totalReviews: 0,
          totalPatients: 0,
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          isVerified: false
        }
      }
    );
    console.log(`    Updated ${doctorsUpdateResult.modifiedCount} doctors\n`);

    // Migration 3: Update patient profiles with default values
    console.log(' Migration 3: Updating patient profiles...');
    const patientsUpdateResult = await Patient.updateMany(
      {
        status: { $exists: false }
      },
      {
        $set: {
          status: 'active',
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0
        }
      }
    );
    console.log(`    Updated ${patientsUpdateResult.modifiedCount} patients\n`);

    // Migration 4: Create indexes
    console.log(' Migration 4: Creating database indexes...');
    try {
      await User.collection.createIndex({ email: 1 }, { unique: true });
      console.log('    Created email index on users');

      await Doctor.collection.createIndex({ userId: 1 }, { unique: true });
      console.log('    Created userId index on doctors');

      await Patient.collection.createIndex({ userId: 1 }, { unique: true });
      console.log('    Created userId index on patients');

      await Appointment.collection.createIndex({ doctorId: 1, appointmentDate: 1 });
      console.log('    Created doctorId, appointmentDate index on appointments\n');
    } catch (error) {
      if (error.code !== 85) { // 85 = index already exists
        throw error;
      }
      console.log('     Indexes already exist\n');
    }

    // Migration 5: Sync all indexes
    console.log(' Migration 5: Syncing all indexes...');
    await mongoose.syncIndexes();
    console.log('    All indexes synced\n');

    // Get migration summary
    const totalUsers = await User.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const totalPatients = await Patient.countDocuments();
    const totalAppointments = await Appointment.countDocuments();

    console.log('╔════════════════════════════════════════╗');
    console.log('║    Migration Complete!              ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Total Users: ${String(totalUsers).padEnd(28)}║`);
    console.log(`║  Total Doctors: ${String(totalDoctors).padEnd(25)}║`);
    console.log(`║  Total Patients: ${String(totalPatients).padEnd(24)}║`);
    console.log(`║  Total Appointments: ${String(totalAppointments).padEnd(18)}║`);
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Error running migration:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Run migration
migrateDatabase();