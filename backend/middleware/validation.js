const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation error handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array().map(error => ({
        field: error.param,
        message: error.msg
      }))
    });
  }

  next();
};

/**
 * User registration validation
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('role')
    .optional()
    .isIn(['admin', 'doctor', 'patient', 'receptionist']).withMessage('Invalid role'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  handleValidationErrors
];

/**
 * User login validation
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Update profile validation
 */
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone format'),
  body('address')
    .optional()
    .trim(),
  handleValidationErrors
];

/**
 * Change password validation
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
  handleValidationErrors
];

/**
 * Doctor profile validation
 */
const validateDoctorProfile = [
  body('licenseNumber')
    .trim()
    .notEmpty().withMessage('License number is required'),
  body('specialization')
    .trim()
    .notEmpty().withMessage('Specialization is required'),
  body('experience')
    .optional()
    .isInt({ min: 0 }).withMessage('Experience must be a non-negative number'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 }).withMessage('Consultation fee must be a positive number'),
  handleValidationErrors
];

/**
 * Patient profile validation
 */
const validatePatientProfile = [
  body('dateOfBirth')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('bloodType')
    .optional()
    .isIn(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']).withMessage('Invalid blood type'),
  handleValidationErrors
];

/**
 * Appointment creation validation
 */
const validateCreateAppointment = [
  body('doctorId')
    .trim()
    .notEmpty().withMessage('Doctor ID is required'),
  body('patientId')
    .trim()
    .notEmpty().withMessage('Patient ID is required'),
  body('appointmentDate')
    .notEmpty().withMessage('Appointment date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('startTime')
    .trim()
    .notEmpty().withMessage('Start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  body('endTime')
    .trim()
    .notEmpty().withMessage('End time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:MM)'),
  body('consultationType')
    .optional()
    .isIn(['in-person', 'video', 'phone']).withMessage('Invalid consultation type'),
  body('reason')
    .optional()
    .trim(),
  handleValidationErrors
];

/**
 * Appointment status update validation
 */
const validateUpdateAppointmentStatus = [
  body('status')
    .trim()
    .notEmpty().withMessage('Status is required')
    .isIn(['scheduled', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
const validateObjectId = [
  param('id')
    .matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid ID format'),
  handleValidationErrors
];

/**
 * Date range validation for queries
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  handleValidationErrors
];

/**
 * Pagination validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Reset password validation
 */
const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword,
  validateDoctorProfile,
  validatePatientProfile,
  validateCreateAppointment,
  validateUpdateAppointmentStatus,
  validateObjectId,
  validateDateRange,
  validatePagination,
  validateResetPassword
};