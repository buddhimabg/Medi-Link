const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

/**
 * Database Seeding Script
 * Populates the database with initial test data
 */

const seedDatabase = async () => {
  try {
    console.log('\n Starting database seeding...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medi-link', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB\n');

    // Clear existing data (optional)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('  Clearing existing data...\n');
      await User.deleteMany({});
      await Doctor.deleteMany({});
      await Patient.deleteMany({});
      await Appointment.deleteMany({});
      console.log(' Existing data cleared\n');
    }

    // Check if admin user already exists
    let adminUser = await User.findOne({ email: 'admin@medilink.com' });

    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@medilink.com',
        password: 'Admin@123456',
        role: 'admin',
        phone: '+1 (555) 001-0001',
        address: '123 Admin Street, New York, NY 10001',
        isActive: true,
        emailVerified: true
      });
      console.log(' Admin user created\n');
    } else {
      console.log('  Admin user already exists\n');
    }

    // Create receptionist users
    console.log(' Creating receptionist users...');
    let receptionistCount = 0;

    for (let i = 1; i <= 2; i++) {
      const receptionist = await User.findOne({
        email: `receptionist${i}@medilink.com`
      });

      if (!receptionist) {
        await User.create({
          name: `Receptionist ${i}`,
          email: `receptionist${i}@medilink.com`,
          password: 'Receptionist@123456',
          role: 'receptionist',
          phone: `+1 (555) 00${i}-000${i}`,
          isActive: true,
          emailVerified: true
        });
        receptionistCount++;
      }
    }

    console.log(` ${receptionistCount} new receptionist users created\n`);

    // Create doctor users and profiles
    console.log('  Creating doctor users and profiles...');

    const doctorData = [
      {
        name: 'Dr. Sarah Johnson',
        email: 'dr.sarah.johnson@medilink.com',
        specialization: 'Cardiology',
        experience: 12,
        qualifications: ['MD', 'Board Certified Cardiologist'],
        consultationFee: 150
      },
      {
        name: 'Dr. Michael Chen',
        email: 'dr.michael.chen@medilink.com',
        specialization: 'Neurology',
        experience: 15,
        qualifications: ['MD', 'Board Certified Neurologist'],
        consultationFee: 160
      },
      {
        name: 'Dr. Priya Sharma',
        email: 'dr.priya.sharma@medilink.com',
        specialization: 'Pediatrics',
        experience: 10,
        qualifications: ['MD', 'Board Certified Pediatrician'],
        consultationFee: 120
      },
      {
        name: 'Dr. James Wilson',
        email: 'dr.james.wilson@medilink.com',
        specialization: 'Orthopedics',
        experience: 18,
        qualifications: ['MD', 'Board Certified Orthopedic Surgeon'],
        consultationFee: 170
      },
      {
        name: 'Dr. Emily Rodriguez',
        email: 'dr.emily.rodriguez@medilink.com',
        specialization: 'General',
        experience: 8,
        qualifications: ['MD', 'General Practitioner'],
        consultationFee: 100
      },
      {
        name: 'Dr. David Lee',
        email: 'dr.david.lee@medilink.com',
        specialization: 'Psychiatry',
        experience: 14,
        qualifications: ['MD', 'Board Certified Psychiatrist'],
        consultationFee: 140
      }
    ];

    let doctorCount = 0;

    for (const doc of doctorData) {
      const existingUser = await User.findOne({ email: doc.email });

      if (!existingUser) {
        // Create user
        const user = await User.create({
          name: doc.name,
          email: doc.email,
          password: 'Doctor@123456',
          role: 'doctor',
          phone: `+1 (555) ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          isActive: true,
          emailVerified: true
        });

        // Create doctor profile
        await Doctor.create({
          userId: user._id,
          licenseNumber: `LIC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          specialization: doc.specialization,
          experience: doc.experience,
          qualifications: doc.qualifications,
          consultationFee: doc.consultationFee,
          status: 'active',
          isVerified: true,
          rating: parseFloat((Math.random() * 1 + 4).toFixed(1)),
          totalReviews: Math.floor(Math.random() * 100) + 50,
          totalPatients: Math.floor(Math.random() * 500) + 100
        });

        doctorCount++;
      }
    }

    console.log(` ${doctorCount} new doctor users and profiles created\n`);

    // Create patient users and profiles
    console.log(' Creating patient users and profiles...');

    const firstNames = ['John', 'Jane', 'Robert', 'Mary', 'Michael', 'Jennifer', 'William', 'Patricia', 'David', 'Linda'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const bloodTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
    const genders = ['male', 'female'];

    let patientCount = 0;

    for (let i = 0; i < 10; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `patient${i + 1}@medilink.com`;

      const existingUser = await User.findOne({ email });

      if (!existingUser) {
        // Create user
        const user = await User.create({
          name: `${firstName} ${lastName}`,
          email,
          password: 'Patient@123456',
          role: 'patient',
          phone: `+1 (555) ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
          address: `${Math.floor(Math.random() * 9000) + 1000} ${lastName} Street, New York, NY ${Math.floor(Math.random() * 89999) + 10000}`,
          isActive: true,
          emailVerified: true
        });

        // Create patient profile
        const dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - Math.floor(Math.random() * 50) - 18);

        await Patient.create({
          userId: user._id,
          dateOfBirth,
          gender: genders[Math.floor(Math.random() * genders.length)],
          bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
          status: 'active',
          emergencyContact: {
            name: `${firstName} ${lastName} Guardian`,
            phone: `+1 (555) ${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            relationship: 'Family Member'
          },
          insurance: {
            provider: 'Blue Cross Blue Shield',
            policyNumber: `BC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
          }
        });

        patientCount++;
      }
    }

    console.log(` ${patientCount} new patient users and profiles created\n`);

    // Create sample appointments
    console.log(' Creating sample appointments...');

    const doctors = await Doctor.find().limit(5);
    const patients = await Patient.find().limit(10);

    let appointmentCount = 0;

    if (doctors.length > 0 && patients.length > 0) {
      for (let i = 0; i < 15; i++) {
        const doctor = doctors[Math.floor(Math.random() * doctors.length)];
        const patient = patients[Math.floor(Math.random() * patients.length)];
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 30));

        const hour = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
        const minute = Math.random() > 0.5 ? 0 : 30;
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endHour = minute === 30 ? hour : hour + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:${minute === 30 ? '00' : '30'}`;

        const existingAppointment = await Appointment.findOne({
          doctorId: doctor._id,
          appointmentDate: {
            $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
            $lt: new Date(appointmentDate).setHours(23, 59, 59, 999)
          },
          startTime
        });

        if (!existingAppointment) {
          await Appointment.create({
            doctorId: doctor._id,
            patientId: patient._id,
            appointmentDate,
            startTime,
            endTime,
            consultationType: Math.random() > 0.5 ? 'in-person' : 'video',
            reason: 'General Checkup',
            status: Math.random() > 0.7 ? 'completed' : 'scheduled'
          });

          appointmentCount++;
        }
      }
    }

    console.log(` ${appointmentCount} sample appointments created\n`);

    console.log('╔════════════════════════════════════════╗');
    console.log('║   Database Seeding Complete!       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log('║                                        ║');
    console.log('║  Admin User:                           ║');
    console.log('║    Email: admin@medilink.com          ║');
    console.log('║    Password: Admin@123456             ║');
    console.log('║                                        ║');
    console.log('║  Test Credentials:                     ║');
    console.log('║    Doctor: doctor@medilink.com        ║');
    console.log('║    Patient: patient@medilink.com      ║');
    console.log('║    Password: <Role>@123456            ║');
    console.log('║                                        ║');
    console.log('╚════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Error seeding database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();