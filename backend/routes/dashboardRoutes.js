const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

/**
 * Dashboard Routes
 */

// All dashboard routes require authentication
// router.use(verifyToken);

// Dashboard Statistics
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/system-status', dashboardController.getSystemStatus);

// User Statistics
router.get('/user-statistics', dashboardController.getUserStatistics);

// Appointment Statistics
router.get('/appointment-statistics', dashboardController.getAppointmentStatistics);

module.exports = router;