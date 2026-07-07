// @ts-check

/**
 * @typedef {Object} ApiConfig
 * @property {string} BASE_URL
 * @property {number} TIMEOUT
 * @property {{
 *   dashboard: (userId: string) => string,
 *   weekly: (userId: string) => string,
 *   history: (userId: string) => string,
 *   insights: (userId: string) => string,
 *   createMood: string,
 *   reportUpload: string,
 *   reportHistory: (userId: string) => string,
 *   reportDetail: (reportId: string) => string,
 * }} ENDPOINTS
 */

/** @type {ApiConfig} */
const env = import.meta.env;

const getEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

export const API_CONFIG = {
  BASE_URL: getEnvValue("VITE_MEDITRACK_API_URL", "VITE_API_URL") || "http://localhost:5000",
  TIMEOUT: 10000,
  ENDPOINTS: {
    dashboard: (userId: string) => `/api/moods/dashboard/${userId}`,
    weekly: (userId: string) => `/api/moods/weekly/${userId}`,
    history: (userId: string) => `/api/moods/history/${userId}`,
    insights: (userId: string) => `/api/moods/insights/${userId}`,
    createMood: "/api/moods",
   
    reportUpload: "/api/lab-reports/upload",
    reportHistory: (userId: string) => `/api/lab-reports/user/${userId}`,
    reportDetail: (reportId: string) => `/api/lab-reports/${reportId}`,
    reminders: (_userId: string) => `/api/reminders`,
    reminderCreate: `/api/reminders`,
    reminderById: (reminderId: string) => `/api/reminders/${reminderId}`,
    prescriptionUpload: "/api/reminders/upload-prescription",
  },
};

export const FACE_API_MODEL_CDN_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

/** @returns {string} */
export const getCurrentUserId = () => {
  return sessionStorage.getItem("userId") || getEnvValue("VITE_MEDITRACK_USER_ID") || "testuser001";
};
