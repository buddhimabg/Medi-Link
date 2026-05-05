/**
 * Validation Helper Functions
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with details
 */
const validatePassword = (password) => {
  const result = {
    isValid: true,
    strength: 'weak',
    errors: []
  };

  if (password.length < 6) {
    result.errors.push('Password must be at least 6 characters');
    result.isValid = false;
  }

  if (!/[a-z]/.test(password)) {
    result.errors.push('Password must contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    result.errors.push('Password must contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    result.errors.push('Password must contain numbers');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    result.errors.push('Password must contain special characters');
  }

  if (result.errors.length === 0) {
    result.strength = 'strong';
  } else if (result.errors.length <= 2) {
    result.strength = 'medium';
  }

  result.isValid = result.errors.length === 0;
  return result;
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
const validatePhone = (phone) => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const validateURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate date format
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if valid date
 */
const validateDate = (date) => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * Validate date is in future
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in future
 */
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Validate date is in past
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is in past
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Validate blood type
 * @param {string} bloodType - Blood type to validate
 * @returns {boolean} True if valid blood type
 */
const validateBloodType = (bloodType) => {
  const validTypes = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  return validTypes.includes(bloodType);
};

/**
 * Validate gender
 * @param {string} gender - Gender to validate
 * @returns {boolean} True if valid gender
 */
const validateGender = (gender) => {
  const validGenders = ['male', 'female', 'other', 'prefer-not-to-say'];
  return validGenders.includes(gender.toLowerCase());
};

/**
 * Validate role
 * @param {string} role - Role to validate
 * @returns {boolean} True if valid role
 */
const validateRole = (role) => {
  const validRoles = ['admin', 'doctor', 'patient', 'receptionist'];
  return validRoles.includes(role.toLowerCase());
};

/**
 * Validate specialization
 * @param {string} specialization - Specialization to validate
 * @returns {boolean} True if valid specialization
 */
const validateSpecialization = (specialization) => {
  const validSpecializations = [
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
  return validSpecializations.includes(specialization);
};

/**
 * Validate appointment status
 * @param {string} status - Status to validate
 * @returns {boolean} True if valid status
 */
const validateAppointmentStatus = (status) => {
  const validStatuses = ['scheduled', 'completed', 'cancelled', 'no-show'];
  return validStatuses.includes(status.toLowerCase());
};

/**
 * Validate time format (HH:MM)
 * @param {string} time - Time to validate
 * @returns {boolean} True if valid time format
 */
const validateTimeFormat = (time) => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
};

/**
 * Validate time is within business hours
 * @param {string} time - Time to validate (HH:MM format)
 * @returns {boolean} True if within business hours
 */
const isBusinessHour = (time) => {
  if (!validateTimeFormat(time)) return false;

  const [hours] = time.split(':').map(Number);
  return hours >= 9 && hours < 17; // 9 AM to 5 PM
};

/**
 * Validate ISO date string
 * @param {string} dateString - ISO date string to validate
 * @returns {boolean} True if valid ISO date
 */
const validateISODate = (dateString) => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  return isoDateRegex.test(dateString) && !isNaN(Date.parse(dateString));
};

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ObjectId to validate
 * @returns {boolean} True if valid ObjectId
 */
const validateObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate appointment time doesn't conflict
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {boolean} True if valid time range
 */
const validateTimeRange = (startTime, endTime) => {
  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    return false;
  }

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return endMinutes > startMinutes;
};

/**
 * Validate file extension
 * @param {string} filename - Filename to validate
 * @param {Array} allowedExtensions - Allowed file extensions
 * @returns {boolean} True if valid extension
 */
const validateFileExtension = (filename, allowedExtensions) => {
  const ext = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(ext);
};

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} True if file size is valid
 */
const validateFileSize = (fileSize, maxSize = 5 * 1024 * 1024) => {
  return fileSize <= maxSize;
};

/**
 * Validate age is within range
 * @param {Date} dateOfBirth - Date of birth
 * @param {number} minAge - Minimum age
 * @param {number} maxAge - Maximum age
 * @returns {boolean} True if age is within range
 */
const validateAge = (dateOfBirth, minAge = 0, maxAge = 150) => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age >= minAge && age <= maxAge;
};

module.exports = {
  validateEmail,
  validatePassword,
  validatePhone,
  validateURL,
  validateDate,
  isFutureDate,
  isPastDate,
  validateBloodType,
  validateGender,
  validateRole,
  validateSpecialization,
  validateAppointmentStatus,
  validateTimeFormat,
  isBusinessHour,
  validateISODate,
  validateObjectId,
  validateTimeRange,
  validateFileExtension,
  validateFileSize,
  validateAge
};