import { create } from "zustand";
import { fetchMoodFixActivities } from "../api/moodApi";

export interface Activity {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  focusTag: string;
  benefit: string;
  description: string;
  moods: string[];
  steps: string[];
}

interface MoodFixStoreState {
  activitiesByMood: Record<string, Activity[]>;
  loadingByMood: Record<string, boolean>;
  errorByMood: Record<string, string | null>;
  lastFetchedByMood: Record<string, number | null>;
  completedIds: string[];
  completedMeta: Record<string, { completedAt: string }>;
  fetchActivitiesByMoodCached: (mood: string, options?: { force?: boolean }) => Promise<Activity[]>;
  invalidateActivitiesForMood: (mood: string) => void;
  initializeCompletedFromStorage: () => void;
  refreshCompletedFromStorage: () => void;
  markActivityCompleted: (activityId: string) => void;
}

const CACHE_FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes

const readStorage = () => {
  let ids: string[] = [];
  let meta: Record<string, { completedAt: string }> = {};
  try {
    const raw = localStorage.getItem("moodfix-completed");
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) ids = parsed;

    const metaRaw = localStorage.getItem("moodfix-completed-meta");
    const metaParsed = metaRaw ? JSON.parse(metaRaw) : {};
    if (metaParsed && typeof metaParsed === "object" && !Array.isArray(metaParsed)) {
      meta = metaParsed;
    }
  } catch {
    ids = [];
    meta = {};
  }
  return { ids, meta };
};

export const useMoodFixStore = create<MoodFixStoreState>((set, get) => ({
  activitiesByMood: {},
  loadingByMood: {},
  errorByMood: {},
  lastFetchedByMood: {},
  completedIds: [],
  completedMeta: {},

  fetchActivitiesByMoodCached: async (mood: string, options?: { force?: boolean }) => {
    const key = (mood || "all").toLowerCase().trim();
    const state = get();
    const lastFetched = state.lastFetchedByMood[key] ?? null;
    const cachedActivities = state.activitiesByMood[key];
    const isFresh = lastFetched !== null && (Date.now() - lastFetched < CACHE_FRESHNESS_MS);

    if (!options?.force && isFresh && Array.isArray(cachedActivities)) {
      return cachedActivities;
    }

    set((prev) => ({
      loadingByMood: { ...prev.loadingByMood, [key]: true },
      errorByMood: { ...prev.errorByMood, [key]: null },
    }));

    try {
      const response = await fetchMoodFixActivities(key === "all" ? undefined : key);
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      const mapped: Activity[] = data.map((item: any) => ({
        id: item.activityId || item.id || item._id,
        title: item.title || "Untitled activity",
        duration: item.duration || "",
        difficulty: item.difficulty || "",
        focusTag: item.focusTag || "",
        benefit: item.benefit || "",
        description: item.description || "",
        moods: Array.isArray(item.moods) ? item.moods : [],
        steps: Array.isArray(item.steps) ? item.steps : [],
      }));

      set((prev) => ({
        activitiesByMood: { ...prev.activitiesByMood, [key]: mapped },
        loadingByMood: { ...prev.loadingByMood, [key]: false },
        errorByMood: { ...prev.errorByMood, [key]: null },
        lastFetchedByMood: { ...prev.lastFetchedByMood, [key]: Date.now() },
      }));
      return mapped;
    } catch (err: any) {
      const errorMsg = err?.message || "Could not load mood-fix activities.";
      set((prev) => ({
        loadingByMood: { ...prev.loadingByMood, [key]: false },
        errorByMood: { ...prev.errorByMood, [key]: errorMsg },
      }));
      return get().activitiesByMood[key] || [];
    }
  },

  invalidateActivitiesForMood: (mood: string) => {
    const key = (mood || "all").toLowerCase().trim();
    set((prev) => {
      const nextLastFetched = { ...prev.lastFetchedByMood };
      delete nextLastFetched[key];
      return { lastFetchedByMood: nextLastFetched };
    });
  },

  initializeCompletedFromStorage: () => {
    const { ids, meta } = readStorage();
    set({ completedIds: ids, completedMeta: meta });
  },

  refreshCompletedFromStorage: () => {
    const { ids, meta } = readStorage();
    set({ completedIds: ids, completedMeta: meta });
  },

  markActivityCompleted: (activityId: string) => {
    const nowStr = new Date().toISOString();
    set((state) => {
      const nextIds = state.completedIds.includes(activityId)
        ? state.completedIds
        : [...state.completedIds, activityId];
      const nextMeta = {
        ...state.completedMeta,
        [activityId]: {
          completedAt: nowStr,
        },
      };

      try {
        localStorage.setItem("moodfix-completed", JSON.stringify(nextIds));
        localStorage.setItem("moodfix-completed-meta", JSON.stringify(nextMeta));
      } catch {
        // ignore storage errors
      }

      return {
        completedIds: nextIds,
        completedMeta: nextMeta,
      };
    });
  },
}));
