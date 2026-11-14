import { create } from "zustand";
import { fetchReminders } from "../api/reminderApi";
import { getErrorMessage } from "../utils/errorHandler";

export type ReminderItem = Record<string, any>;

export interface ReminderStoreState {
  reminders: ReminderItem[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  setReminders: (updater: ReminderItem[] | ((prev: ReminderItem[]) => ReminderItem[])) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchRemindersCached: (userId: string, options?: { force?: boolean }) => Promise<ReminderItem[]>;
  invalidateReminders: () => void;
  addReminder: (reminder: ReminderItem) => void;
  updateReminder: (reminderId: string, updates: Record<string, any>) => void;
  removeReminder: (reminderId: string) => void;
}

export const extractReminderList = (response: any): ReminderItem[] => {
  if (Array.isArray(response?.reminders)) {
    return response.reminders;
  }
  if (Array.isArray(response?.data?.reminders)) {
    return response.data.reminders;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  if (Array.isArray(response)) {
    return response;
  }
  return [];
};

const FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const useReminderStore = create<ReminderStoreState>((set, get) => ({
  reminders: [],
  loading: false,
  error: null,
  lastFetched: null,

  setReminders: (updater) =>
    set((state) => ({
      reminders: typeof updater === "function" ? updater(state.reminders) : updater,
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error: error || null }),

  fetchRemindersCached: async (userId: string, options?: { force?: boolean }) => {
    const state = get();
    const now = Date.now();

    // If cache is fresh and not forced, return cached reminders without fetching
    if (!options?.force && state.lastFetched !== null && (now - state.lastFetched < FRESHNESS_WINDOW_MS)) {
      return state.reminders;
    }

    // Only show full-page loading spinner if we don't have reminders yet and never fetched
    if (state.reminders.length === 0 && state.lastFetched === null) {
      set({ loading: true, error: null });
    } else {
      set({ error: null });
    }

    try {
      const res = await fetchReminders(userId);
      const loadedReminders = extractReminderList(res);
      set({
        reminders: loadedReminders,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      });
      return loadedReminders;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err, "Failed to load reminders.");
      set({
        loading: false,
        error: errorMessage,
      });
      throw err;
    }
  },

  invalidateReminders: () => set({ lastFetched: null }),

  addReminder: (reminder) =>
    set((state) => ({
      reminders: [...state.reminders, reminder],
    })),

  updateReminder: (reminderId, updates) =>
    set((state) => ({
      reminders: state.reminders.map((r) => {
        const currentId = String(r._id || r.id || "");
        if (currentId === String(reminderId)) {
          return { ...r, ...updates };
        }
        return r;
      }),
    })),

  removeReminder: (reminderId) =>
    set((state) => ({
      reminders: state.reminders.filter((r) => {
        const currentId = String(r._id || r.id || "");
        return currentId !== String(reminderId);
      }),
    })),
}));
