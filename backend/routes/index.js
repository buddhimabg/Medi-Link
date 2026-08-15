const express = require('express');
const router = express.Router();

/**
 * Aggregate all routes
 */

// Import all route files
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const doctorRoutes = require('./doctorRoutes');
const patientRoutes = require('./patientRoutes');
const appointmentRoutes = require('./appointmentRoutes');
const reportRoutes = require('./reportRoutes');
const systemRoutes = require('./systemRoutes');

/**
 * API Routes
 */

// Authentication routes
router.use('/auth', authRoutes);

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// Doctor management routes
router.use('/doctors', doctorRoutes);

// Patient management routes
router.use('/patients', patientRoutes);

// Appointment management routes
router.use('/appointments', appointmentRoutes);

// Report and analytics routes
router.use('/reports', reportRoutes);

// System routes
router.use('/system', systemRoutes);

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * API documentation endpoint
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Medi-Link API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: '/api/auth',
      dashboard: '/api/dashboard',
      doctors: '/api/doctors',
      patients: '/api/patients',
      appointments: '/api/appointments',
      reports: '/api/reports',
      system: '/api/system'
    }
  });
});

module.exports = router;