// src/routes/patientHistoryRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/patientHistoryController');
const { protect } = require('../middlewares/auth');

// GET  /api/patient-history/session/:sessionId  — history for a session
router.get('/session/:sessionId', protect, ctrl.getHistoryBySession);

// GET  /api/patient-history/:patientId          — all sessions for a patient
router.get('/:patientId', protect, ctrl.getHistory);

// POST /api/patient-history                     — save completed session
router.post('/', protect, ctrl.saveHistory);

module.exports = router;