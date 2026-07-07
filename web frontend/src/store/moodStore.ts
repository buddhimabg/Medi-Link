// @ts-check
// store/moodStore.js
import { create } from "zustand";

/**
 * @typedef {{
 *   sleepLevel: number,
 *   anxietyLevel: number,
 *   energyLevel: number,
 *   motivationLevel: number,
 *   socialInteraction: number,
 *   stressLevel: number,
 *   focusLevel: number,
 * }} MoodLevels
 *
 * @typedef {{
 *   mood: string,
 *   note: string,
 *   date: string,
 *   levels: MoodLevels,
 *   aiFields?: Record<string, any>,
 * }} CurrentCheckIn
 *
 * @typedef {{
 *   sevenDayAverage: string,
 *   checkInStreak: number,
 *   recoveryScore: number,
 *   weeklyData: unknown[],
 * }} DashboardData
 *
 * @typedef {{
 *   entries: unknown[],
 *   insights: unknown,
 * }} MoodHistoryData
 *
 * @typedef {{
 *   dashboardData: DashboardData,
 *   loading: boolean,
 *   error: string | null,
 *   setDashboardData: (updater: DashboardData | ((state: DashboardData) => DashboardData)) => void,
 *   setLoading: (loading: boolean) => void,
 *   setError: (error: string | null) => void,
 *   clearDashboardError: () => void,
 *   currentCheckIn: CurrentCheckIn,
 *   lastSubmission: unknown,
 *   setCurrentCheckIn: (updater: Partial<CurrentCheckIn> | ((state: CurrentCheckIn) => Partial<CurrentCheckIn>)) => void,
 *   setLevels: (levels: Partial<MoodLevels>) => void,
 *   resetCurrentCheckIn: () => void,
 *   setLastSubmission: (payload: unknown) => void,
 *   clearLastSubmission: () => void,
 *   moodHistoryData: MoodHistoryData,
 *   moodHistoryLoading: boolean,
 *   moodHistoryError: string | null,
 *   setMoodHistoryData: (updater: MoodHistoryData | ((state: MoodHistoryData) => MoodHistoryData)) => void,
 *   setMoodHistoryLoading: (moodHistoryLoading: boolean) => void,
 *   setMoodHistoryError: (moodHistoryError: string | null) => void,
 *   clearMoodHistoryError: () => void,
 *   insights: unknown,
 *   insightsLoading: boolean,
 *   insightsError: string | null,
 *   setInsights: (insights: unknown) => void,
 *   setInsightsLoading: (insightsLoading: boolean) => void,
 *   setInsightsError: (insightsError: string | null) => void,
 *   clearInsightsError: () => void,
 * }} MoodStoreState
 */

/** @type {MoodLevels} */
const defaultLevels = {
  sleepLevel: null,
  anxietyLevel: null,
  energyLevel: null,
  motivationLevel: null,
  socialInteraction: null,
  stressLevel: null,
  focusLevel: null,
};

/** @type {CurrentCheckIn} */
const defaultCurrentCheckIn = {
  mood: "",
  note: "",
  date: "",
  levels: defaultLevels,
  aiFields: {} as Record<string, any>,
};

/** @type {import("zustand").StateCreator<MoodStoreState, [], []>} */
const moodStoreCreator = (set: any, _get: any) => ({
  // ========================
  // Dashboard data
  // ========================
  dashboardData: {
    sevenDayAverage: "0",
    checkInStreak: 0,
    recoveryScore: 0,
    weeklyData: [],
  },
  loading: true,
  error: null,

  setDashboardData: (updater: any) =>
    set((state: any) => ({
      dashboardData:
        typeof updater === "function" ? updater(state.dashboardData) : updater,
    })),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  clearDashboardError: () => set({ error: null }),

  // ========================
  // Current check-in data
  // ========================
  currentCheckIn: defaultCurrentCheckIn,
  lastSubmission: null,

  // ========================
  // Check-in actions
  // ========================

  // Update mood, note, date
  setCurrentCheckIn: (updater: any) =>
    set((state: any) => {
      const nextPatch =
        typeof updater === "function"
          ? updater(state.currentCheckIn)
          : updater || {};

      return {
        currentCheckIn: {
          ...state.currentCheckIn,
          ...nextPatch,
        },
      };
    }),

  // Update levels only
  setLevels: (levels: any) =>
    set((state: any) => ({
      currentCheckIn: {
        ...state.currentCheckIn,
        levels: { ...state.currentCheckIn.levels, ...levels },
      },
    })),

  // Reset all check-in data
  resetCurrentCheckIn: () =>
    set({
      currentCheckIn: {
        mood: "",
        note: "",
        date: "",
        levels: { ...defaultLevels },
      },
    }),

  setLastSubmission: (payload: unknown) => set({ lastSubmission: payload }),
  clearLastSubmission: () => set({ lastSubmission: null }),

  // ========================
  // Mood history analytics
  // ========================
  moodHistoryData: {
    entries: [],
    insights: null,
  },
  moodHistoryLoading: false,
  moodHistoryError: null,

  setMoodHistoryData: (updater: any) =>
    set((state: any) => ({
      moodHistoryData:
        typeof updater === "function" ? updater(state.moodHistoryData) : updater,
    })),
  setMoodHistoryLoading: (moodHistoryLoading: boolean) => set({ moodHistoryLoading }),
  setMoodHistoryError: (moodHistoryError: string | null) => set({ moodHistoryError }),
  clearMoodHistoryError: () => set({ moodHistoryError: null }),

  // ========================
  // Insights data
  // ========================
  insights: null,
  insightsLoading: false,
  insightsError: null,

  setInsights: (insights: unknown) => set({ insights }),
  setInsightsLoading: (insightsLoading: boolean) => set({ insightsLoading }),
  setInsightsError: (insightsError: string | null) => set({ insightsError }),
  clearInsightsError: () => set({ insightsError: null }),
});

export const useMoodStore = create(moodStoreCreator);