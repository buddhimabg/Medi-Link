const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { AuthenticationError, ValidationError, DuplicateError } = require('../utils/errorHandler');
const { logger } = require('../middleware/logger');

/**
 * Authentication Service
 * Handles all authentication-related business logic
 */

/**
 * Register user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} User and token
 */
exports.registerUser = async (userData) => {
  try {
    const { name, email, password, role, phone } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new DuplicateError('Email', email);
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'patient',
      phone,
      isActive: true
    });

    await user.save();

    // Generate token
    const token = this.generateToken(user._id, user.role);

    logger.info(`User registered successfully`, { email, role: user.role });

    return {
      user: this.formatUserResponse(user),
      token
    };
  } catch (error) {
    logger.error(`Register user error: ${error.message}`);
    throw error;
  }
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User and token
 */
exports.loginUser = async (email, password) => {
  try {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      logger.warn(`Login failed: User not found`, { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      logger.warn(`Login failed: Account locked`, { email });
      throw new AuthenticationError('Account is temporarily locked. Please try again later');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn(`Login failed: User inactive`, { email });
      throw new AuthenticationError('Your account is deactivated');
    }

    // Compare passwords
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      logger.warn(`Login failed: Invalid password`, { email });
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset login attempts
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = this.generateToken(user._id, user.role);

    logger.info(`User login successful`, { email, role: user.role });

    return {
      user: this.formatUserResponse(user),
      token
    };
  } catch (error) {
    logger.error(`Login user error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify token
 * @param {string} token - JWT token
 * @returns {Object} Decoded token
 */
exports.verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw error;
  }
};

/**
 * Generate JWT token
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
exports.generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * Change password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
exports.changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user`, { userId });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    throw error;
  }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<string>} Reset token
 */
exports.requestPasswordReset = async (email) => {
  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user._id, type: 'password_reset' },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );

    logger.info(`Password reset requested`, { email });

    return resetToken;
  } catch (error) {
    logger.error(`Request password reset error: ${error.message}`);
    throw error;
  }
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
exports.resetPassword = async (token, newPassword) => {
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');

    if (decoded.type !== 'password_reset') {
      throw new AuthenticationError('Invalid reset token');
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error('User not found');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password reset successful`, { userId: decoded.id });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    throw error;
  }
};

/**
 * Format user response (exclude sensitive data)
 * @param {Object} user - User object
 * @returns {Object} Formatted user object
 */
exports.formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    profileImage: user.profileImage,
    isActive: user.isActive,
    emailVerified: user.emailVerified
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 */
exports.updateUserProfile = async (userId, updateData) => {
  try {
    const { name, email, phone, address, profileImage } = updateData;

    // Check if email already exists
    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: userId }
      });

      if (existingUser) {
        throw new DuplicateError('Email', email);
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
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

    logger.info(`User profile updated`, { userId });

    return this.formatUserResponse(user);
  } catch (error) {
    logger.error(`Update user profile error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify email
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
exports.verifyUserEmail = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { emailVerified: true });
    logger.info(`Email verified for user`, { userId });
  } catch (error) {
    logger.error(`Verify email error: ${error.message}`);
    throw error;
  }
};