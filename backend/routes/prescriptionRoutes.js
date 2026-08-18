// src/routes/prescriptionRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/videoCallController');
const prescriptionCtrl = require('../controllers/prescriptionController');
const { protect, requireRole } = require('../middlewares/auth');

// POST  /api/prescriptions           — issue a new prescription (doctor only)
router.post('/', protect, requireRole('doctor'), ctrl.issuePrescription);

// GET   /api/prescriptions/patient/:patientId — all prescriptions for a patient, newest first
router.get('/patient/:patientId', prescriptionCtrl.getPatientPrescriptions);

// GET   /api/prescriptions/:id/download — download a single prescription as PDF
router.get('/:id/download', prescriptionCtrl.downloadPrescription);

// GET   /api/prescriptions/:sessionId — get prescriptions for a session
router.get('/:sessionId', protect, ctrl.getPrescriptions);

module.exports = router;