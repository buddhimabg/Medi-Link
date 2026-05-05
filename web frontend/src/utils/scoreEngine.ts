/**
 * FRONTEND SCORE ENGINE - SINGLE SOURCE OF TRUTH
 * Mirrors backend scoreEngine.js to ensure consistent calculations across all pages
 * Used by: Dashboard, MoodHistory, InsightsPage, all calculation-dependent components
 */

export type MoodName = "terrible" | "sad" | "okay" | "good" | "great";

export interface MoodEntry {
  mood?: string | null;
  sleepLevel?: number | string | null;
  energyLevel?: number | string | null;
  motivationLevel?: number | string | null;
  socialInteraction?: number | string | null;
  focusLevel?: number | string | null;
  anxietyLevel?: number | string | null;
  stressLevel?: number | string | null;
  createdAt?: string | number | Date | null;
  [key: string]: unknown;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Convert mood text to numeric value
 * @param {string} mood - Mood text (terrible, sad, okay, good, great)
 * @returns {number} Score 2-10
 */
export const getMoodValue = (mood: string | null | undefined): number => {
  const map: Record<MoodName, number> = {
    terrible: 2,
    sad: 4,
    okay: 6,
    good: 8,
    great: 10,
  };
  return map[mood?.toLowerCase() as MoodName] ?? 5;
};

/**
 * Safe number conversion with fallback
 * @param {*} v - Value to convert
 * @param {number} def - Default if NaN
 * @returns {number}
 */
export const num = (v: unknown, def = 5): number => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

/**
 * Format date to YYYY-MM-DD in local timezone
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date: string | number | Date | null | undefined): string => {
  const d = new Date(date ?? new Date());
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// ==========================================
// CORE CALCULATION
// ==========================================

/**
 * Calculate mental health score (0–10)
 * Weights: mood(15%), sleep(12%), energy(10%), motivation(10%), social(10%), focus(8%), anxiety(-20%), stress(-15%)
 * @param {Object} m - Mood document
 * @returns {number} Score 0-10
 */
export const calculateMentalHealthScore = (m: MoodEntry): number => {
  const moodValue = getMoodValue(m.mood);
  const sleep = num(m.sleepLevel);
  const energy = num(m.energyLevel);
  const motivation = num(m.motivationLevel);
  const social = num(m.socialInteraction);
  const focus = num(m.focusLevel);
  const anxiety = num(m.anxietyLevel);
  const stress = num(m.stressLevel);

  const positive =
    moodValue * 0.15 +
    sleep * 0.12 +
    energy * 0.1 +
    motivation * 0.1 +
    social * 0.1 +
    focus * 0.08;

  const negative = anxiety * 0.2 + stress * 0.15;
  let score = (positive - negative * 0.5) / 0.75;

  score = Math.max(0, Math.min(10, score));
  return Number(score.toFixed(1));
};

// ==========================================
// AGGREGATION FUNCTIONS
// ==========================================

/**
 * Calculate recovery score based on real mood data (not averages)
 * Criteria: sleep >= 7, anxiety <= 4, energy >= 6, social >= 5, mood in [good,great], stress <= 4
 * @param {Array} moods - Array of mood documents
 * @returns {number} Recovery percentage 0-100
 */
export const calculateRecoveryScore = (moods: MoodEntry[]): number => {
  if (!moods.length) return 0;

  let good = 0;
  let total = 0;

  moods.forEach((m) => {
    if (num(m.sleepLevel) >= 7) good++;
    total++;
    if (num(m.anxietyLevel) <= 4) good++;
    total++;
    if (num(m.energyLevel) >= 6) good++;
    total++;
    if (num(m.socialInteraction) >= 5) good++;
    total++;
    if (m.mood === "good" || m.mood === "great") good++;
    total++;
    if (num(m.stressLevel) <= 4) good++;
    total++;
  });

  return Math.round((good / total) * 100);
};

/**
 * Calculate check-in streak (consecutive days with at least one check-in)
 * @param {Array} moods - Moods sorted by date DESC
 * @returns {number} Streak count
 */
export const calculateCheckInStreak = (moods: MoodEntry[]): number => {
  if (!moods.length) return 0;

  const uniqueDates = [...new Set(moods.map((m) => formatDate(m.createdAt)).filter(Boolean))].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (!uniqueDates.length) return 0;

  // Current streak must be anchored to today or yesterday.
  // If the most recent check-in is older than yesterday, streak is not active.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const latest = new Date(uniqueDates[0]);
  latest.setHours(0, 0, 0, 0);
  if (latest.getTime() !== today.getTime() && latest.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let streak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      streak = 1;
      continue;
    }

    const diff =
      (new Date(uniqueDates[i - 1]).getTime() - new Date(uniqueDates[i]).getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else break;
  }

  return streak;
};

/**
 * Convert mood to 0-100 scale
 * @param {string} mood - Mood text
 * @returns {number} Score 0-100
 */
export const getMoodScore100 = (mood: string | null | undefined): number => {
  const map: Record<MoodName, number> = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100,
  };
  return map[mood?.toLowerCase() as MoodName] ?? 60;
};

/**
 * Normalize 1-10 level to 0-100
 * @param {number} value - Value 1-10
 * @returns {number} Score 0-100
 */
export const normalize1to100 = (value: number | string | null | undefined): number => {
  const v = num(value, 5);
  return v * 10;
};

/**
 * Calculate mental health trend (0-100 weighted score)
 * Weights: sleep(0.2), anxiety(0.2 inverted), stress(0.15 inverted), energy(0.15), motivation(0.1), focus(0.1), social(0.1)
 * @param {Object} m - Mood document
 * @returns {number} Score 0-100
 */
export const calculateMentalHealthTrend = (m: MoodEntry): number => {
  const sleepScore = normalize1to100(m.sleepLevel);
  const energyScore = normalize1to100(m.energyLevel);
  const motivationScore = normalize1to100(m.motivationLevel);
  const socialScore = normalize1to100(m.socialInteraction);
  const focusScore = normalize1to100(m.focusLevel);
  const anxietyScore = 100 - normalize1to100(m.anxietyLevel); // inverted
  const stressScore = 100 - normalize1to100(m.stressLevel); // inverted

  const weighted =
    sleepScore * 0.2 +
    anxietyScore * 0.2 +
    stressScore * 0.15 +
    energyScore * 0.15 +
    motivationScore * 0.1 +
    focusScore * 0.1 +
    socialScore * 0.1;

  return Number(Math.max(0, Math.min(100, weighted)).toFixed(1));
};

/**
 * Calculate 7-day average from moods using mental health score
 * @param {Array} moods - Moods for last 7 days
 * @returns {number} Average 0.0-10.0
 */
export const calculateSevenDayAverage = (moods: MoodEntry[]): number => {
  if (!moods.length) return 0;

  // Use stored mentalHealthScore if available, otherwise calculate
  const validScores = moods
    .map((m: any) => m.mentalHealthScore || calculateMentalHealthScore(m))
    .filter((score) => score > 0);

  if (!validScores.length) return 0;

  const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
  return Number(avg.toFixed(1));
};

/**
 * Calculate daily average for a specific day
 * @param {Array} moods - Moods for a specific day
 * @returns {number} Average 0.0-10.0
 */
export const calculateDailyAverage = (moods: MoodEntry[]): number => {
  if (!moods.length) return 0;

  // Use stored mentalHealthScore if available, otherwise calculate
  const validScores = moods
    .map((m: any) => m.mentalHealthScore || calculateMentalHealthScore(m))
    .filter((score) => score > 0);

  if (!validScores.length) return 0;

  const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
  return Number(avg.toFixed(1));
};

/**
 * Calculate weekly average from moods using mental health score
 * @param {Array} moods - Moods for last 7 days
 * @returns {number} Average 0.0-10.0
 */
export const calculateWeeklyAverage = (moods: MoodEntry[]): number => {
  return calculateSevenDayAverage(moods);
};

/**
 * Calculate average of a metric across entries
 * @param {Array} items - Array of mood entries
 * @param {string} fieldName - Field to average
 * @returns {number} Average value 0-100
 */
export const averageMetric100 = (items: MoodEntry[], fieldName: string): number => {
  if (!items.length) return 0;
  const values = items.map((item) => {
    const val = num(item[fieldName], 5);
    // Invert if negative metric
    if (fieldName === "anxietyLevel" || fieldName === "stressLevel") {
      return 100 - val * 10;
    }
    if (fieldName === "mood") {
      return getMoodScore100(item.mood);
    }
    return val * 10;
  });
  const sum = values.reduce((a, b) => a + b, 0);
  return Number((sum / values.length).toFixed(1));
};

// ==========================================
// CONSTANTS
// ==========================================

export const MOOD_ENUM = ["terrible", "sad", "okay", "good", "great"];

export const VALID_LEVELS = {
  min: 1,
  max: 10,
};
