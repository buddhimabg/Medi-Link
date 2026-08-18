const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/adminSessionController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

/**
 * Admin Medical Session Routes
 * Base path: /api/admin/sessions
 */

// Aggregated stats & next ID helpers
router.get('/stats', sessionController.getSessionStats);
router.get('/next-id', sessionController.getNextSessionId);

// List sessions with search, filters, pagination
router.get('/', sessionController.getSessions);

// Single session by ID
router.get('/:id', sessionController.getSessionById);

// Create session (Admin)
router.post('/', sessionController.createSession);

// Update session (Admin)
router.put('/:id', sessionController.updateSession);

// Quick status change
router.patch('/:id/status', sessionController.updateSessionStatus);

// Delete session (Admin)
router.delete('/:id', sessionController.deleteSession);

module.exports = router;
