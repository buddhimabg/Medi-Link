const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { 
  validateRegister, 
  validateLogin, 
  validateChangePassword,
  validateResetPassword
} = require('../middleware/validation');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

/**
 * Authentication Routes
 */

// Public Routes
router.post('/register', registerLimiter, validateRegister, authController.register);
router.post('/login', loginLimiter, validateLogin, authController.login);
router.post('/request-password-reset', passwordResetLimiter, authController.requestPasswordReset);
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

// Protected Routes
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, validateChangePassword, authController.changePassword);
router.post('/logout', verifyToken, authController.logout);

// Security Settings
router.put('/security-settings', verifyToken, authController.updateSecuritySettings);
router.put('/notification-preferences', verifyToken, authController.updateNotificationPreferences);

module.exports = router;