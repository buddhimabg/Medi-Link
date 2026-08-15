/**
 * General Helper Functions
 */

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Resolves after delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
const generateRandomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Capitalize each word in string
 * @param {string} str - String to capitalize
 * @returns {string} Title case string
 */
const titleCase = (str) => {
  if (!str) return '';
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
const truncate = (str, length = 50, suffix = '...') => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Remove duplicates from array
 * @param {Array} arr - Array
 * @returns {Array} Array with unique items
 */
const removeDuplicates = (arr) => {
  return [...new Set(arr)];
};

/**
 * Sort array of objects by property
 * @param {Array} arr - Array of objects
 * @param {string} property - Property to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
const sortByProperty = (arr, property, order = 'asc') => {
  return [...arr].sort((a, b) => {
    if (a[property] < b[property]) return order === 'asc' ? -1 : 1;
    if (a[property] > b[property]) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group array by property
 * @param {Array} arr - Array of objects
 * @param {string} property - Property to group by
 * @returns {Object} Grouped object
 */
const groupBy = (arr, property) => {
  return arr.reduce((grouped, item) => {
    const key = item[property];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
    return grouped;
  }, {});
};

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge objects
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {Object} Merged object
 */
const mergeObjects = (obj1, obj2) => {
  return { ...obj1, ...obj2 };
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Convert object to query string
 * @param {Object} obj - Object to convert
 * @returns {string} Query string
 */
const objectToQueryString = (obj) => {
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {Object} Parsed object
 */
const queryStringToObject = (queryString) => {
  const obj = {};
  const pairs = queryString.split('&');
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    obj[decodeURIComponent(key)] = decodeURIComponent(value);
  });
  return obj;
};

/**
 * Filter object by keys
 * @param {Object} obj - Object to filter
 * @param {Array} keys - Keys to keep
 * @returns {Object} Filtered object
 */
const filterObjectByKeys = (obj, keys) => {
  return keys.reduce((filtered, key) => {
    if (key in obj) {
      filtered[key] = obj[key];
    }
    return filtered;
  }, {});
};

/**
 * Omit keys from object
 * @param {Object} obj - Object to filter
 * @param {Array} keys - Keys to omit
 * @returns {Object} Filtered object
 */
const omitKeys = (obj, keys) => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

/**
 * Format number with comma separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Calculate percentage
 * @param {number} part - Part amount
 * @param {number} total - Total amount
 * @returns {number} Percentage
 */
const calculatePercentage = (part, total) => {
  return total > 0 ? ((part / total) * 100).toFixed(2) : 0;
};

/**
 * Round number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
const roundTo = (num, decimals = 2) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
};

/**
 * Generate random color
 * @returns {string} Hex color code
 */
const generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
};

/**
 * Get contrasting text color (black or white)
 * @param {string} hexColor - Hex color code
 * @returns {string} Contrasting color ('black' or 'white')
 */
const getContrastingTextColor = (hexColor) => {
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Result of function
 */
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

module.exports = {
  sleep,
  generateRandomString,
  generateUniqueId,
  capitalize,
  titleCase,
  truncate,
  removeDuplicates,
  sortByProperty,
  groupBy,
  deepClone,
  mergeObjects,
  isEmpty,
  objectToQueryString,
  queryStringToObject,
  filterObjectByKeys,
  omitKeys,
  formatNumber,
  formatCurrency,
  calculatePercentage,
  roundTo,
  getInitials,
  generateRandomColor,
  getContrastingTextColor,
  retryWithBackoff
};