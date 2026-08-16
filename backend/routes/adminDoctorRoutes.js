const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, isAdmin, isDoctor } = require('../middlewares/auth');
const { validateDoctorProfile, validateObjectId, validatePagination } = require('../middlewares/validation');
const { uploadImage } = require('../middlewares/fileUpload');

/**
 * Doctor Routes
 */

// Get all doctors
router.get('/', validatePagination, doctorController.getAllDoctors);

// Get doctor statistics
router.get('/statistics', doctorController.getDoctorStatistics);

// Get doctor approval statistics
router.get('/approval-stats', doctorController.getApprovalStats);

// Get doctor by ID
router.get('/:id', validateObjectId, doctorController.getDoctorById);

// Get doctor appointments
router.get('/:doctorId/appointments', doctorController.getDoctorAppointments);

// Create a new doctor (Admin) - creates User + Doctor
router.post('/', verifyToken, isAdmin, doctorController.createDoctor);

// Update doctor (Admin) - updates User + Doctor
router.put('/:id', verifyToken, isAdmin, validateObjectId, doctorController.updateDoctor);

// Verify doctor (Admin approval / rejection)
router.patch('/:id/verify', verifyToken, isAdmin, validateObjectId, doctorController.verifyDoctor);
router.put('/:id/verify', verifyToken, isAdmin, validateObjectId, doctorController.verifyDoctor);

// Update doctor status
router.patch('/:id/status', verifyToken, isAdmin, doctorController.updateDoctorStatus);

// Delete doctor (deletes User + Doctor)
router.delete('/:id', verifyToken, isAdmin, validateObjectId, doctorController.deleteDoctor);

// Doctor self-service profile management (requires auth)
router.post('/profile', verifyToken, isDoctor, validateDoctorProfile, doctorController.createOrUpdateDoctorProfile);

module.exports = router;