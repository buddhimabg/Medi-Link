import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMoodStore } from "../store/moodStore";

import {
  fetchDashboardStats,
  fetchWeeklyData,
  createCheckIn,
  fetchMoodHistory,
  fetchInsights,
} from "../api/moodApi";

import { handleError } from "../utils/errorHandler";
import { getCurrentUserId } from "../config";
// Insights computation moved to backend; frontend displays API data only.

/* =========================
   INSIGHTS BUILDER
========================= */
/* =========================
   INSIGHTS HOOK (API-only)
   Frontend no longer computes insights locally. It only requests backend.
========================= */
export const useInsightsData = (userId: string = getCurrentUserId()) => {
  const {
    insights,
    insightsLoading,
    insightsError,
    setInsights,
    setInsightsLoading,
    setInsightsError,
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);

      const apiInsights = await fetchInsights(userId);
      setInsights(apiInsights || null);
    } catch (err) {
      // Do not compute locally; surface a simple offline/error message
      setInsights(null);
      setInsightsError("You're offline or something went wrong. Try again later.");
    } finally {
      setInsightsLoading(false);
    }
  }, [userId, setInsights, setInsightsLoading, setInsightsError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    insights,
    insightsLoading,
    insightsError,
    fetchData,
  };
};

/* =========================
   DASHBOARD HOOK
========================= */
export const useDashboardData = (userId: string = getCurrentUserId()) => {
  const {
    dashboardData,
    loading,
    error,
    setDashboardData,
    setLoading,
    setError,
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, weeklyData] = await Promise.all([
        fetchDashboardStats(userId),
        fetchWeeklyData(userId),
      ]);

      const statsDataTyped = statsData as any;
      const weeklyDataTyped = weeklyData as any;
      const avgValue = Number(statsDataTyped?.sevenDayAverage || 0);

      setDashboardData({
        sevenDayAverage: Number.isNaN(avgValue)
          ? "0"
          : avgValue.toFixed(1),
        checkInStreak: statsDataTyped?.checkInStreak || 0,
        recoveryScore: statsDataTyped?.recoveryScore || 0,
        weeklyData: Array.isArray(weeklyDataTyped) ? weeklyDataTyped : [],
      });
    } catch (err) {
      setError(handleError(err, "useDashboardData.fetchData"));
    } finally {
      setLoading(false);
    }
  }, [userId, setDashboardData, setLoading, setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dashboardData, loading, error, fetchData, setDashboardData };
};

/* =========================
   CHECK-IN HOOK
========================= */
export const useCheckIn = () => {
  const navigate = useNavigate();
  const {
    currentCheckIn,
    dashboardData,
    setDashboardData,
    setCurrentCheckIn,
    resetCurrentCheckIn,
    setLastSubmission,
  } = useMoodStore();

  const startCheckIn = useCallback(() => {
    resetCurrentCheckIn();
    navigate("/check-in");
  }, [navigate, resetCurrentCheckIn]);

  const updateCheckIn = useCallback(
    (stepData: any) => {
      setCurrentCheckIn((prev: any) => ({ ...prev, ...stepData }));
    },
    [setCurrentCheckIn]
  );

  const submitCheckIn = useCallback(async () => {
    try {
      const payload = {
        userId: getCurrentUserId(),
        mood: currentCheckIn?.mood || "",
        note: currentCheckIn?.note || "",
        ...currentCheckIn?.levels,
      };

      const response = (await createCheckIn(payload)) as any;
      setLastSubmission(response || null);

      if (typeof response?.checkInStreak === "number") {
        setDashboardData({
          ...dashboardData,
          checkInStreak: response.checkInStreak,
        });
      }

      navigate("/check-in/summary", {
        state: {
          checkInSuccess: true,
          mentalHealthScore: response?.mentalHealthScore,
          checkInStreak: response?.checkInStreak,
          isFirstCheckInToday: response?.isFirstCheckInToday,
        },
      });
    } catch (err) {
      throw new Error(handleError(err, "useCheckIn.submitCheckIn"));
    }
  }, [currentCheckIn, dashboardData, navigate, setDashboardData, setLastSubmission]);

  return { currentCheckIn, startCheckIn, updateCheckIn, submitCheckIn };
};

/* =========================
   MOOD HISTORY HOOK
========================= */
export const useMoodHistoryData = (userId: string = getCurrentUserId()) => {
  const {
    moodHistoryData,
    moodHistoryLoading,
    moodHistoryError,
    setMoodHistoryData,
    setMoodHistoryLoading,
    setMoodHistoryError,
  } = useMoodStore();

  const fetchData = useCallback(async () => {
    try {
      setMoodHistoryLoading(true);
      setMoodHistoryError(null);
      
      // Fetch both history entries and insights in parallel
      const [historyEntriesRaw, insightsRaw] = await Promise.all([
        fetchMoodHistory(userId),
        fetchInsights(userId),
      ]);
      
      const historyEntries = Array.isArray(historyEntriesRaw)
        ? historyEntriesRaw
        : [];
      
      const insights = insightsRaw || null;

      // Store both entries and insights
      setMoodHistoryData({
        entries: historyEntries,
        insights: insights,
      });
    } catch (err) {
      setMoodHistoryError(handleError(err, "useMoodHistoryData.fetchData"));
    } finally {
      setMoodHistoryLoading(false);
    }
  }, [userId, setMoodHistoryData, setMoodHistoryLoading, setMoodHistoryError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    moodHistoryData,
    moodHistoryLoading,
    moodHistoryError,
    fetchData,
  };
};