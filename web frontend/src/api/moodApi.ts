import client from "./client";
import { API_CONFIG } from "../config";

export const fetchDashboardStats = async (userId: string) => {
  return client.get(API_CONFIG.ENDPOINTS.dashboard(userId));
};

export const fetchWeeklyData = async (userId: string) => {
  return client.get(API_CONFIG.ENDPOINTS.weekly(userId));
};

export const createCheckIn = async (payload: any) => {
  return client.post(API_CONFIG.ENDPOINTS.createMood, payload);
};

export const updateCheckIn = async (checkInId: string, payload: any) => {
  return client.patch(`${API_CONFIG.ENDPOINTS.createMood}/${checkInId}`, payload);
};

export const fetchMoodHistory = async (userId: string) => {
  return client.get(API_CONFIG.ENDPOINTS.history(userId));
};

export const fetchWeeklyInsights = async (userId: string) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};

export const fetchInsights = async (userId: string) => {
  return client.get(API_CONFIG.ENDPOINTS.insights(userId));
};

// Mood Fix Activity APIs
export const fetchMoodFixActivities = async () => {
  return client.get("/api/mood-fix/activities");
};

export const saveMoodAfterFeedback = async (feedbackData: any) => {
  return client.post("/api/mood-fix/feedback", feedbackData);
};