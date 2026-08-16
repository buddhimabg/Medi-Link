const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const { validateDateRange, validatePagination, validateObjectId } = require('../middlewares/validation');

/**
 * Report Routes
 */

router.use(verifyToken, isAdmin);

// Get all reports (Admin only)
router.get('/', validatePagination, reportController.getAllReports);

// Dashboard Statistics
router.get('/stats/dashboard', reportController.getDashboardStats);

// Analytics Endpoints
router.get('/analytics/appointments-trends', reportController.getAppointmentTrends);
router.get('/analytics/appointment-status', reportController.getAppointmentStatus);
router.get('/analytics/appointment-types', reportController.getAppointmentTypes);
router.get('/analytics/revenue-trends', reportController.getRevenueTrends);
router.get('/analytics/revenue-breakdown', reportController.getRevenueBreakdown);
router.get('/analytics/payment-methods', reportController.getPaymentMethods);
router.get('/analytics/specialty-performance', reportController.getSpecialtyPerformance);
router.get('/analytics/top-doctors', reportController.getTopDoctors);
router.get('/analytics/patient-satisfaction', reportController.getPatientSatisfaction);

// Generate Reports
router.post('/generate/appointment', validateDateRange, reportController.generateAppointmentReport);
router.post('/generate/patient', validateDateRange, reportController.generatePatientReport);
router.post('/generate/revenue', validateDateRange, reportController.generateRevenueReport);

// Export Report
router.get('/:reportId/export', reportController.exportReportToCSV);

// Get report by ID (must be after all specific routes to avoid catching them)
router.get('/:id', validateObjectId, reportController.getReportById);

// Delete Report (Admin only)
router.delete('/:id', validateObjectId, reportController.deleteReport);

module.exports = router;
