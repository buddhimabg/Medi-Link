const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { validatePatientProfile, validateObjectId, validatePagination } = require('../middleware/validation');

/**
 * Patient Routes
 */

// Public Routes
// router.use(verifyToken);

// Get all patients
router.get('/', validatePagination, patientController.getAllPatients);

// Get patient statistics
router.get('/statistics', patientController.getPatientStatistics);

// Get patient by ID
router.get('/:id', validateObjectId, patientController.getPatientById);

// Get patient appointments
router.get('/:patientId/appointments', patientController.getPatientAppointments);

// Get patient medical history
router.get('/:patientId/medical-history', patientController.getPatientMedicalHistory);

// Update patient profile
router.put('/:id', validateObjectId, validatePatientProfile, patientController.updatePatientProfile);

// Delete patient (Admin only)
router.delete('/:id', validateObjectId, patientController.deletePatient);

module.exports = router;