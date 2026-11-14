const express = require('express');
const router = express.Router();
const adminPaymentController = require('../controllers/adminPaymentController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Protect all admin payment routes
router.use(verifyToken, isAdmin);

// Analytics summary
router.get('/analytics', adminPaymentController.getPaymentAnalytics);

// Export payments
router.get('/export', adminPaymentController.exportPayments);

// List payments with search, pagination, and filters
router.get('/', adminPaymentController.getPayments);

// Single payment details
router.get('/:id', adminPaymentController.getPaymentById);

// Update status
router.patch('/:id/status', adminPaymentController.updatePaymentStatus);

module.exports = router;
