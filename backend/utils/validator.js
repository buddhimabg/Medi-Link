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

/**
 * Checks if a word is meaningful.
 * Rejects words that:
 * - Contain no alphabetic letters.
 * - Contain only a single repeating letter if the word is longer than 1 character (except single letters 'a' and 'i').
 * - Have no vowels (a, e, i, o, u, y) if the word length is >= 3.
 * - Match common keyboard mash patterns.
 * - Have 4 or more consecutive identical characters.
 * @param {string} word
 * @returns {boolean}
 */
const isMeaningfulWord = (word) => {
  if (typeof word !== "string") return false;
  const letters = word.toLowerCase().replace(/[^a-z]/g, '');
  
  if (letters.length === 0) return false;
  
  if (letters.length === 1) {
    return letters === 'a' || letters === 'i';
  }
  
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size === 1) return false;
  
  if (letters.length >= 3 && !/[aeiouy]/.test(letters)) {
    return false;
  }
  
  const keyboardMashes = [
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm'
  ];
  for (const mash of keyboardMashes) {
    if (letters.includes(mash)) return false;
  }
  
  if (/([a-z])\1\1\1/.test(letters)) return false;
  
  return true;
};

/**
 * Checks if a journal text is meaningful.
 * Rejects text that is:
 * - Empty
 * - Less than 15 characters after trimming
 * - Contains only symbols/numbers (no letters)
 * - Has fewer than 3 meaningful words
 * @param {string} text
 * @returns {boolean}
 */
const isMeaningfulText = (text) => {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  
  if (trimmed.length < 15) return false;
  
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  const words = trimmed.split(/\s+/);
  let meaningfulCount = 0;
  for (const word of words) {
    if (isMeaningfulWord(word)) {
      meaningfulCount++;
    }
  }
  
  return meaningfulCount >= 3;
};

module.exports = {
  validateCheckInData,
  validateUserId,
  isMeaningfulText
};

