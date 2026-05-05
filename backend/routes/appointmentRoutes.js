const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken, isAdmin, isDoctor } = require('../middleware/auth');
const { 
  validateCreateAppointment, 
  validateUpdateAppointmentStatus,
  validateObjectId,
  validateDateRange,
  validatePagination
} = require('../middleware/validation');

/**
 * Appointment Routes
 */

// Public Routes - Require authentication
router.use(verifyToken);

// Get all appointments
router.get('/', validatePagination, validateDateRange, appointmentController.getAllAppointments);

// Get appointment statistics
router.get('/statistics', appointmentController.getAppointmentStatistics);

// Get appointment by ID
router.get('/:id', validateObjectId, appointmentController.getAppointmentById);

// Create appointment
router.post('/', validateCreateAppointment, appointmentController.createAppointment);

// Update appointment
router.put('/:id', validateObjectId, appointmentController.updateAppointment);

// Update appointment status
router.patch('/:id/status', validateObjectId, validateUpdateAppointmentStatus, appointmentController.updateAppointmentStatus);

// Cancel appointment
router.delete('/:id', validateObjectId, appointmentController.cancelAppointment);

module.exports = router;