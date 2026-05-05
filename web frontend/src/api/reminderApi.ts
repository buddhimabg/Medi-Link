import client from "./client";
import { API_CONFIG } from "../config";

interface ReminderPayload {
  [key: string]: unknown;
}

export const createReminder = async (payload: ReminderPayload, userId: string): Promise<any> => {
  return client.post(API_CONFIG.ENDPOINTS.reminderCreate, {
    ...payload,
    userId,
  });
};

export const fetchReminders = async (userId: string): Promise<any> => {
  return client.get(API_CONFIG.ENDPOINTS.reminders(userId), {
    params: { userId },
  });
};

export const updateReminder = async (reminderId: string, payload: ReminderPayload, userId: string): Promise<any> => {
  return client.patch(API_CONFIG.ENDPOINTS.reminderById(reminderId), {
    ...payload,
    userId,
  });
};

export const deleteReminder = async (reminderId: string, userId: string): Promise<any> => {
  return client.delete(API_CONFIG.ENDPOINTS.reminderById(reminderId), {
    data: { userId },
  });
};
