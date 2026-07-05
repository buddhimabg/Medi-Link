// src/routes/appointmentRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/appointmentController');
const { protect, requireRole } = require('../middleware/auth');

// ⚠️ TEMPORARY — remove after you've confirmed your real doctorId
// GET /api/appointments/debug-doctor-id
router.get('/debug-doctor-id', protect, ctrl.debugDoctorId);

// GET /api/appointments/doctor/queue  — enriched queue with patient names
// ⚠️ Must be defined BEFORE /doctor to avoid Express route conflict
router.get('/doctor/queue', protect, requireRole('doctor'), ctrl.getDoctorQueueEnriched);

// GET /api/appointments/doctor  — raw appointments list
router.get('/doctor', protect, requireRole('doctor'), ctrl.getDoctorQueue);

module.exports = router;