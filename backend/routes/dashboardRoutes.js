const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

/**
 * Dashboard Routes
 */

router.use(verifyToken, isAdmin);

// Dashboard Statistics
router.get('/stats', dashboardController.getDashboardStats);
router.get('/recent-activity', dashboardController.getRecentActivity);
router.get('/system-status', dashboardController.getSystemStatus);

// User Statistics
router.get('/user-statistics', dashboardController.getUserStatistics);

// Appointment Statistics
router.get('/appointment-statistics', dashboardController.getAppointmentStatistics);

module.exports = router;
