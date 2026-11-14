const express = require('express');
const router = express.Router();
const adminNotificationController = require('../controllers/adminNotificationController');
const { verifyToken, isAdmin } = require('../middlewares/auth');

/**
 * Admin Notification & Email Dispatch Routes
 * Mounted at /api/admin/notifications
 */

// Allow fetching status & templates with or without strict auth for smooth previewing,
// while protecting sending actions with verifyToken + isAdmin
router.get('/smtp-status', adminNotificationController.getSmtpStatus);
router.get('/templates', adminNotificationController.getTemplates);
router.get('/recipients', adminNotificationController.getRecipients);

// Sending operations (Protected by Admin Auth)
router.post('/test', verifyToken, isAdmin, adminNotificationController.sendTestEmail);
router.post('/send', verifyToken, isAdmin, adminNotificationController.sendNotificationBroadcast);

// Logs & History (Protected by Admin Auth)
router.get('/logs', verifyToken, isAdmin, adminNotificationController.getEmailLogs);
router.get('/logs/:id', verifyToken, isAdmin, adminNotificationController.getEmailLogById);

module.exports = router;
