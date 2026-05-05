const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
  AuthenticationError, 
  ValidationError, 
  DuplicateError,
  NotFoundError 
} = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/notificationService');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword, role, phone } = req.body;

    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      return next(new ValidationError('Please provide all required fields'));
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return next(new ValidationError('Passwords do not match'));
    }

    // Check password length
    if (password.length < 6) {
      return next(new ValidationError('Password must be at least 6 characters long'));
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return next(new DuplicateError('Email', email));
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role: role || 'patient',
      phone,
      isActive: true,
      emailVerified: false
    });

    await user.save();

    // Create role-specific records
    if (user.role === 'doctor') {
      const doctor = new Doctor({
        userId: user._id
      });
      await doctor.save();
      logger.info(`Authentication: register`, { email, role: 'doctor' });
    } else if (user.role === 'patient') {
      const patient = new Patient({
        userId: user._id
      });
      await patient.save();
      logger.info(`Authentication: register`, { email, role: 'patient' });
    }

    // Send welcome email asynchronously
    try {
      await sendWelcomeEmail(user.email, user.name || 'User');
    } catch (emailError) {
      logger.warn(`Failed to send welcome email`, { email: user.email, error: emailError.message });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    next(error);
  }
};

/**
 * User login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return next(new ValidationError('Please provide email and password'));
    }

    // Find user by email and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn(`Login failed: User not found`, { email });
      return next(new AuthenticationError('Invalid email or password'));
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      logger.warn(`Login failed: Account locked`, { email });
      return next(new AuthenticationError('Account is temporarily locked. Please try again later'));
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      logger.warn(`Login failed: Invalid password`, { email });
      return next(new AuthenticationError('Invalid email or password'));
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Login failed: User inactive`, { email });
      return next(new AuthenticationError('Your account is deactivated'));
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    logger.info(`Authentication: login successful`, { email, role: user.role });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('-password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    next(error);
  }
};

/**
 * Update user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, address, profileImage } = req.body;

    // Check if email already exists (if changing email)
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.userId }
      });

      if (existingUser) {
        return next(new DuplicateError('Email', email));
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        profileImage: profileImage || undefined,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    logger.info(`User profile updated`, { userId: req.userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    next(error);
  }
};

/**
 * Change password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new ValidationError('Please provide all required fields'));
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return next(new ValidationError('New passwords do not match'));
    }

    // Check password length
    if (newPassword.length < 6) {
      return next(new ValidationError('New password must be at least 6 characters long'));
    }

    // Get user with password field
    const user = await User.findById(req.userId).select('+password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      logger.warn(`Password change failed: Invalid current password`, { userId: req.userId });
      return next(new AuthenticationError('Current password is incorrect'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`User password changed`, { userId: req.userId });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    next(error);
  }
};

/**
 * Update security settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSecuritySettings = async (req, res, next) => {
  try {
    const { twoFactorEnabled, autoLogoutEnabled } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : undefined,
        autoLogoutEnabled: autoLogoutEnabled !== undefined ? autoLogoutEnabled : undefined,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    logger.info(`Security settings updated`, { userId: req.userId });

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      data: user
    });
  } catch (error) {
    logger.error(`Update security settings error: ${error.message}`);
    next(error);
  }
};

/**
 * Update notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const { type, enabled } = req.body;

    if (!type || enabled === undefined) {
      return next(new ValidationError('Please provide notification type and enabled status'));
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        [`notificationPreferences.${type}`]: enabled,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    logger.info(`Notification preferences updated`, { userId: req.userId, type });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: user
    });
  } catch (error) {
    logger.error(`Update notification preferences error: ${error.message}`);
    next(error);
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res, next) => {
  try {
    logger.info(`User logged out`, { userId: req.userId });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
};

/**
 * Verify email token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new ValidationError('Verification token is required'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { emailVerified: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return next(new NotFoundError('User'));
    }

    logger.info(`Email verified`, { userId: decoded.id });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: user
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Verification token has expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid verification token'));
    }

    logger.error(`Email verification error: ${error.message}`);
    next(error);
  }
};

/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ValidationError('Email is required'));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(new NotFoundError('User'));
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendPasswordResetEmail(email, resetLink);
      logger.info(`Password reset email sent`, { email });
    } catch (emailError) {
      logger.warn(`Failed to send password reset email`, { email, error: emailError.message });
    }

    res.json({
      success: true,
      message: 'Password reset instructions have been sent if the email exists in our system',
      debugToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
    });
  } catch (error) {
    logger.error(`Password reset request error: ${error.message}`);
    next(error);
  }
};

/**
 * Reset password with token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return next(new ValidationError('Token and new passwords are required'));
    }

    if (newPassword !== confirmPassword) {
      return next(new ValidationError('Passwords do not match'));
    }

    if (newPassword.length < 6) {
      return next(new ValidationError('Password must be at least 6 characters long'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    if (decoded.type !== 'password_reset') {
      return next(new AuthenticationError('Invalid reset token'));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new NotFoundError('User'));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password reset successful`, { userId: decoded.id });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Reset token has expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new AuthenticationError('Invalid reset token'));
    }

    logger.error(`Password reset error: ${error.message}`);
    next(error);
  }
};