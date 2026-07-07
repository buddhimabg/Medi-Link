import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMoodStore } from "../store/moodStore";
import type { OverviewData } from "../types/mood";

import {
  fetchOverview,
  createCheckIn,
  fetchMoodHistory,
  fetchInsights,
} from "../api/moodApi";

import { handleError } from "../utils/errorHandler";
import { getCurrentUserId } from "../config";
// Insights computation moved to backend; frontend displays API data only.

const CACHE_FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes

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
    lastFetchedInsights,
    setLastFetchedInsights,
  } = useMoodStore();

  const fetchData = useCallback(async (force: boolean = false) => {
    const isFresh =
      insights !== null &&
      lastFetchedInsights !== null &&
      Date.now() - lastFetchedInsights < CACHE_FRESHNESS_MS;

    if (!force && isFresh) {
      if (insightsLoading) {
        setInsightsLoading(false);
      }
      return;
    }

    try {
      setInsightsLoading(true);
      setInsightsError(null);

      const apiInsights = await fetchInsights(userId);
      setInsights(apiInsights || null);
      setLastFetchedInsights(Date.now());
    } catch (err) {
      // Do not compute locally; surface a simple offline/error message
      setInsights(null);
      setInsightsError("You're offline or something went wrong. Try again later.");
    } finally {
      setInsightsLoading(false);
    }
  }, [userId, insights, lastFetchedInsights, insightsLoading, setInsights, setInsightsLoading, setInsightsError, setLastFetchedInsights]);

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
    lastFetchedDashboard,
    setLastFetchedDashboard,
  } = useMoodStore();

  const fetchData = useCallback(async (force: boolean = false) => {
    const isFresh =
      lastFetchedDashboard !== null &&
      Date.now() - lastFetchedDashboard < CACHE_FRESHNESS_MS;

    if (!force && isFresh) {
      if (loading) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const overview = await fetchOverview(userId) as unknown as OverviewData;
      const statsDataTyped = overview.dashboardStats;
      const weeklyDataTyped = overview.weeklyChart;
      
      const avgValue = Number(statsDataTyped?.sevenDayAverage || 0);

      setDashboardData({
        sevenDayAverage: Number.isNaN(avgValue)
          ? "0"
          : avgValue.toFixed(1),
        checkInStreak: statsDataTyped?.checkInStreak || 0,
        recoveryScore: statsDataTyped?.recoveryScore || 0,
        weeklyData: Array.isArray(weeklyDataTyped) ? weeklyDataTyped : [],
      });
      setLastFetchedDashboard(Date.now());
      
      // Also set insights if available
      if (overview.insights) {
        useMoodStore.getState().setInsights(overview.insights);
        useMoodStore.getState().setLastFetchedInsights(Date.now());
      }
    } catch (err) {
      setError(handleError(err, "useDashboardData.fetchData"));
    } finally {
      setLoading(false);
    }
  }, [userId, lastFetchedDashboard, loading, setDashboardData, setLoading, setError, setLastFetchedDashboard]);

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

      const response = await createCheckIn(payload) as { mentalHealthScore?: number; checkInStreak?: number; isFirstCheckInToday?: boolean; [key: string]: any };
      setLastSubmission(response || null);

      if (typeof response?.checkInStreak === "number") {
        setDashboardData({
          ...dashboardData,
          checkInStreak: response.checkInStreak,
        });
      }

      // Invalidate mood caches after new check-in
      useMoodStore.getState().setLastFetchedDashboard(null);
      useMoodStore.getState().setLastFetchedMoodHistory(null);
      useMoodStore.getState().setLastFetchedInsights(null);

      try {
        localStorage.removeItem("moodDraft");
      } catch (e) {
        // ignore storage errors
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
    lastFetchedMoodHistory,
    setLastFetchedMoodHistory,
    insights,
    lastFetchedInsights,
    setInsights,
    setLastFetchedInsights,
  } = useMoodStore();

  const fetchData = useCallback(async (force: boolean = false) => {
    const isHistoryFresh =
      lastFetchedMoodHistory !== null &&
      Date.now() - lastFetchedMoodHistory < CACHE_FRESHNESS_MS;

    const isInsightsFresh =
      insights !== null &&
      lastFetchedInsights !== null &&
      Date.now() - lastFetchedInsights < CACHE_FRESHNESS_MS;

    if (!force && isHistoryFresh && isInsightsFresh) {
      if (moodHistoryLoading) {
        setMoodHistoryLoading(false);
      }
      return;
    }

    try {
      setMoodHistoryLoading(true);
      setMoodHistoryError(null);
      
      const fetchHistoryPromise = (!force && isHistoryFresh)
        ? Promise.resolve(moodHistoryData.entries || [])
        : fetchMoodHistory(userId);

      const fetchInsightsPromise = (!force && isInsightsFresh)
        ? Promise.resolve(insights)
        : fetchInsights(userId);

      const [historyEntriesRaw, insightsRaw] = await Promise.all([
        fetchHistoryPromise,
        fetchInsightsPromise,
      ]);
      
      const historyEntries = Array.isArray(historyEntriesRaw)
        ? historyEntriesRaw
        : [];
      
      const nextInsights = insightsRaw || null;

      // Store both entries and insights
      setMoodHistoryData({
        entries: historyEntries,
        insights: nextInsights,
      });

      if (!isHistoryFresh || force) {
        setLastFetchedMoodHistory(Date.now());
      }
      if ((!isInsightsFresh || force) && nextInsights !== null) {
        setInsights(nextInsights);
        setLastFetchedInsights(Date.now());
      }
    } catch (err) {
      setMoodHistoryError(handleError(err, "useMoodHistoryData.fetchData"));
    } finally {
      setMoodHistoryLoading(false);
    }
  }, [userId, lastFetchedMoodHistory, lastFetchedInsights, insights, moodHistoryData.entries, moodHistoryLoading, setMoodHistoryData, setMoodHistoryLoading, setMoodHistoryError, setLastFetchedMoodHistory, setInsights, setLastFetchedInsights]);

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