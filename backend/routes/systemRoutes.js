const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

/**
 * System Routes
 */

// Get system activity (Admin only)
router.get('/activity', verifyToken, isAdmin, systemController.getSystemActivity);

// Get system statistics (Admin only)
router.get('/statistics', verifyToken, isAdmin, systemController.getSystemStatistics);

// Get system health (Public - for monitoring)
router.get('/health', systemController.getSystemHealth);

// Log activity
router.post('/log-activity', verifyToken, systemController.logActivity);

// Get activity by type
router.get('/activity/:type', verifyToken, isAdmin, systemController.getActivityByType);

// Clear old activities (Admin only)
router.post('/clear-old-activities', verifyToken, isAdmin, systemController.clearOldActivities);

module.exports = router;