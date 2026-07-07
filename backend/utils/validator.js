// mood-backend/utils/validators.js

const { MOOD_ENUM, VALID_LEVELS } = require("./scoreEngine.js");

/**
 * Validate check-in data before saving to database
 * @param {Object} data - Request body
 * @returns {Object} { isValid: boolean, errors: Object }
 */
const validateCheckInData = (data) => {
  const errors = {};

  // Required fields
  if (!data.userId || typeof data.userId !== "string") {
    errors.userId = "User ID is required and must be a string";
  }

  if (!data.mood || !MOOD_ENUM.includes(data.mood.toLowerCase())) {
    errors.mood = `Mood must be one of: ${MOOD_ENUM.join(", ")}`;
  }

  // Optional note
  if (data.note && typeof data.note !== "string") {
    errors.note = "Note must be a string";
  }

  // Level validations (all required, must be 1-10)
  const levelFields = [
    "sleepLevel",
    "anxietyLevel",
    "energyLevel",
    "motivationLevel",
    "socialInteraction",
    "stressLevel",
    "focusLevel"
  ];

  levelFields.forEach((field) => {
    const raw = data[field];
    if (raw === undefined || raw === null || raw === "") {
      // Field omitted is allowed; no error
      return;
    }
    const value = Number(raw);
    if (isNaN(value) || value < VALID_LEVELS.min || value > VALID_LEVELS.max) {
      errors[field] = `${field} must be a number between ${VALID_LEVELS.min} and ${VALID_LEVELS.max}`;
    }
  });

  if (data.createdAt !== undefined) {
    const timestamp = new Date(data.createdAt).getTime();
    if (Number.isNaN(timestamp)) {
      errors.createdAt = "createdAt must be a valid date";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate userId parameter
 * @param {string} userId
 * @returns {boolean}
 */
const validateUserId = (userId) => {
  return userId && typeof userId === "string" && userId.trim().length > 0;
};

module.exports = {
  validateCheckInData,
  validateUserId
};
