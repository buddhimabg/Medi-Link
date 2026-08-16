// src/routes/prescriptionRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/videoCallController');
const { protect, requireRole } = require('../middlewares/auth');

// POST  /api/prescriptions           — issue a new prescription (doctor only)
router.post('/', protect, requireRole('doctor'), ctrl.issuePrescription);

// GET   /api/prescriptions/:sessionId — get prescriptions for a session
router.get('/:sessionId', protect, ctrl.getPrescriptions);

module.exports = router;