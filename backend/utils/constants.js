/**
 * Application Constants
 */

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
  RECEPTIONIST: 'receptionist'
};

// Doctor Specializations
const SPECIALIZATIONS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'General',
  'Psychiatry',
  'Dermatology',
  'Oncology',
  'Urology',
  'Counselor'
];

// Blood Types
const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

// Gender Options
const GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'];

// Appointment Status
const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no-show'
};

// Consultation Types
const CONSULTATION_TYPES = {
  IN_PERSON: 'in-person',
  VIDEO: 'video',
  PHONE: 'phone'
};

// Doctor Status
const DOCTOR_STATUS = {
  ACTIVE: 'active',
  ON_LEAVE: 'on-leave',
  INACTIVE: 'inactive'
};

// Patient Status
const PATIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

// Activity Types
const ACTIVITY_TYPES = {
  USER_REGISTERED: 'user_registered',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  PATIENT_REGISTERED: 'patient_registered',
  DOCTOR_PROFILE_ADDED: 'doctor_profile_added',
  APPOINTMENT_SCHEDULED: 'appointment_scheduled',
  APPOINTMENT_COMPLETED: 'appointment_completed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PRESCRIPTION_ISSUED: 'prescription_issued',
  REPORT_GENERATED: 'report_generated'
};

// Report Types
const REPORT_TYPES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  APPOINTMENT: 'appointment',
  REVENUE: 'revenue',
  SYSTEM: 'system',
  PERFORMANCE: 'performance'
};

// Report Status
const REPORT_STATUS = {
  DRAFT: 'draft',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
};

// Prescription Status
const PRESCRIPTION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

// Payment Methods
const PAYMENT_METHODS = {
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  INSURANCE: 'insurance',
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  DIGITAL_WALLET: 'digital_wallet'
};

// Notification Types
const NOTIFICATION_TYPES = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PRESCRIPTION_READY: 'prescription_ready',
  REPORT_GENERATED: 'report_generated',
  SYSTEM_ALERT: 'system_alert'
};

// Notification Priority
const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// API Paths
const API_PATHS = {
  AUTH: '/api/auth',
  DASHBOARD: '/api/dashboard',
  DOCTORS: '/api/doctors',
  PATIENTS: '/api/patients',
  APPOINTMENTS: '/api/appointments',
  REPORTS: '/api/reports',
  SYSTEM: '/api/system'
};

// Pagination
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Time Constants
const TIME_CONSTANTS = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
  ONE_YEAR: 365 * 24 * 60 * 60 * 1000
};

// Validation Rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 100,
  PHONE_MIN_LENGTH: 10,
  BIO_MAX_LENGTH: 500,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMAGE_SIZE: 2 * 1024 * 1024, // 2MB
  LOGIN_ATTEMPTS_LIMIT: 5,
  LOCK_TIME: 2 * 60 * 60 * 1000 // 2 hours
};

// Business Hours
const BUSINESS_HOURS = {
  START_HOUR: 9,
  END_HOUR: 17,
  START_TIME: '09:00',
  END_TIME: '17:00'
};

// Severity Levels
const SEVERITY_LEVELS = {
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe'
};

// Error Messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  EMAIL_EXISTS: 'Email already registered',
  UNAUTHORIZED: 'You do not have permission to access this resource',
  SERVER_ERROR: 'An error occurred. Please try again later',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_INPUT: 'Invalid input provided',
  DATABASE_ERROR: 'Database operation failed',
  FILE_UPLOAD_ERROR: 'File upload failed'
};

// Success Messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  REGISTER_SUCCESS: 'Registration successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  OPERATION_SUCCESS: 'Operation completed successfully'
};

// Email Templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  PRESCRIPTION_READY: 'prescription_ready'
};

module.exports = {
  USER_ROLES,
  SPECIALIZATIONS,
  BLOOD_TYPES,
  GENDERS,
  APPOINTMENT_STATUS,
  CONSULTATION_TYPES,
  DOCTOR_STATUS,
  PATIENT_STATUS,
  ACTIVITY_TYPES,
  REPORT_TYPES,
  REPORT_STATUS,
  PRESCRIPTION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  HTTP_STATUS,
  API_PATHS,
  PAGINATION,
  TIME_CONSTANTS,
  VALIDATION_RULES,
  BUSINESS_HOURS,
  SEVERITY_LEVELS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  EMAIL_TEMPLATES
};