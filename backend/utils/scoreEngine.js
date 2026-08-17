// mood-backend/utils/scoreEngine.js

/**
 * SINGLE SOURCE OF TRUTH for all mood scoring calculations
 */

// ==========================================
// CONSTANTS
// ==========================================

const MOOD_ENUM = ["terrible", "sad", "okay", "good", "great"];

const VALID_LEVELS = {
  min: 1,
  max: 10
};

// Unified mood score (0–100) — used everywhere
const MOOD_SCORE_MAP_100 = {
  terrible: 0,
  sad: 40,
  okay: 60,
  good: 80,
  great: 100
};

// Single Source of Truth for Wellbeing Weights (sums to 1.00)
const WELLBEING_WEIGHTS = {
  mood: 0.22,
  sleep: 0.18,
  anxiety: 0.18,
  stress: 0.15,
  energy: 0.12,
  motivation: 0.07,
  focus: 0.05,
  social: 0.03
};

// Recovery Weights (sums to 1.00) — specialized recovery metric
const RECOVERY_WEIGHTS = {
  mood: 0.20,
  sleep: 0.15,
  anxiety: 0.15,
  stress: 0.15,
  energy: 0.12,
  motivation: 0.09,
  focus: 0.07,
  social: 0.07
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Maps mood string to normalized 0-100 value.
 */
const getMoodScore100 = (mood) => {
  return MOOD_SCORE_MAP_100[mood?.toLowerCase()] ?? 60;
};

/**
 * Maps mood string to normalized 0-10 value.
 */
const getMoodValue = (mood) => {
  return getMoodScore100(mood) / 10;
};

/**
 * Safely parses numeric metric levels. Falls back to default 5.5 (neutral midpoint for 1–10 scale) if value is null, undefined, or NaN.
 */
const num = (v, def = 5.5) => {
  if (v === null || v === undefined || v === "") return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
};

const clampLevel = (v) => Math.max(1, Math.min(10, num(v)));

/**
 * Standard positive 1-10 factor normalization to 0-100 scale: (val - 1) / 9 * 100
 */
const normalizePositive1to10 = (v) => {
  const val = clampLevel(v);
  return ((val - 1) / 9) * 100;
};

/**
 * Standard negative 1-10 factor (anxiety/stress) inversion & normalization to 0-100 scale: (10 - val) / 9 * 100
 */
const normalizeInverted1to10 = (v) => {
  const val = clampLevel(v);
  return ((10 - val) / 9) * 100;
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// ==========================================
// CORE CALCULATION
// ==========================================

const calculateMentalHealthScore = (m = {}) => {
  const mood100 = getMoodScore100(m.mood);
  const sleep100 = normalizePositive1to10(m.sleepLevel);
  const energy100 = normalizePositive1to10(m.energyLevel);
  const motivation100 = normalizePositive1to10(m.motivationLevel);
  const focus100 = normalizePositive1to10(m.focusLevel);
  const social100 = normalizePositive1to10(m.socialInteraction);

  const anxiety100 = normalizeInverted1to10(m.anxietyLevel);
  const stress100 = normalizeInverted1to10(m.stressLevel);

  const score100 =
    mood100 * WELLBEING_WEIGHTS.mood +
    sleep100 * WELLBEING_WEIGHTS.sleep +
    anxiety100 * WELLBEING_WEIGHTS.anxiety +
    stress100 * WELLBEING_WEIGHTS.stress +
    energy100 * WELLBEING_WEIGHTS.energy +
    motivation100 * WELLBEING_WEIGHTS.motivation +
    focus100 * WELLBEING_WEIGHTS.focus +
    social100 * WELLBEING_WEIGHTS.social;

  const score = Math.max(0, Math.min(10, score100 / 10));
  return Number(score.toFixed(1));
};

// ==========================================
// NORMALIZATION
// ==========================================

const normalizeMetric = (value, min, max, inverse = false) => {
  const val = num(value, 5.5);
  const clamped = Math.max(min, Math.min(max, val));
  let score = ((clamped - min) / (max - min)) * 100;
  return inverse ? 100 - score : score;
};

const calculateMoodScore = (mood) => {
  return getMoodScore100(mood);
};

// ==========================================
// RECOVERY SCORE
// ==========================================

const calculateMoodRecoveryScore = (m = {}) => {
  const sleep = normalizePositive1to10(m.sleepLevel);
  const anxiety = normalizeInverted1to10(m.anxietyLevel);
  const stress = normalizeInverted1to10(m.stressLevel);
  const energy = normalizePositive1to10(m.energyLevel);
  const motivation = normalizePositive1to10(m.motivationLevel);
  const focus = normalizePositive1to10(m.focusLevel);
  const social = normalizePositive1to10(m.socialInteraction);
  const moodScore = getMoodScore100(m.mood);

  const weighted =
    sleep * RECOVERY_WEIGHTS.sleep +
    anxiety * RECOVERY_WEIGHTS.anxiety +
    stress * RECOVERY_WEIGHTS.stress +
    energy * RECOVERY_WEIGHTS.energy +
    motivation * RECOVERY_WEIGHTS.motivation +
    focus * RECOVERY_WEIGHTS.focus +
    social * RECOVERY_WEIGHTS.social +
    moodScore * RECOVERY_WEIGHTS.mood;

  const finalScore = Math.max(0, Math.min(100, weighted));

  return Number(finalScore.toFixed(1));
};

const calculateRecoveryScore = (moods) => {
  if (!moods || !moods.length) return 0;

  const scores = moods.map(calculateMoodRecoveryScore);
  const avg =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return Math.round(avg);
};

// ==========================================
// STREAK
// ==========================================

const calculateCheckInStreak = (moods) => {
  if (!moods || !moods.length) return 0;

  const uniqueDates = [
    ...new Set(moods.map((m) => formatDate(m.createdAt)))
  ].sort((a, b) => new Date(b) - new Date(a));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const latest = new Date(uniqueDates[0]);
  latest.setHours(0, 0, 0, 0);

  if (
    latest.getTime() !== today.getTime() &&
    latest.getTime() !== yesterday.getTime()
  ) {
    return 0;
  }

  let streak = 0;

  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      streak = 1;
      continue;
    }

    const diff =
      (new Date(uniqueDates[i - 1]) - new Date(uniqueDates[i])) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else break;
  }

  return streak;
};

// ==========================================
// OTHER UTILITIES
// ==========================================

const normalize1to100 = (value) => {
  return normalizePositive1to10(value);
};

const calculateMentalHealthTrend = (m = {}) => {
  const mood100 = getMoodScore100(m.mood);
  const sleepScore = normalizePositive1to10(m.sleepLevel);
  const energyScore = normalizePositive1to10(m.energyLevel);
  const motivationScore = normalizePositive1to10(m.motivationLevel);
  const focusScore = normalizePositive1to10(m.focusLevel);
  const socialScore = normalizePositive1to10(m.socialInteraction);

  const anxietyScore = normalizeInverted1to10(m.anxietyLevel);
  const stressScore = normalizeInverted1to10(m.stressLevel);

  const weighted =
    mood100 * WELLBEING_WEIGHTS.mood +
    sleepScore * WELLBEING_WEIGHTS.sleep +
    anxietyScore * WELLBEING_WEIGHTS.anxiety +
    stressScore * WELLBEING_WEIGHTS.stress +
    energyScore * WELLBEING_WEIGHTS.energy +
    motivationScore * WELLBEING_WEIGHTS.motivation +
    focusScore * WELLBEING_WEIGHTS.focus +
    socialScore * WELLBEING_WEIGHTS.social;

  return Number(Math.max(0, Math.min(100, weighted)).toFixed(1));
};

const calculateSevenDayAverage = (moods) => {
  if (!moods || !moods.length) return 0;

  const validScores = moods
    .map((m) => m.mentalHealthScore || calculateMentalHealthScore(m))
    .filter((s) => s > 0);

  if (!validScores.length) return 0;

  const avg =
    validScores.reduce((a, b) => a + b, 0) / validScores.length;

  return Number(avg.toFixed(1));
};

const averageMetric100 = (items, fieldName) => {
  if (!items || !items.length) return 0;

  const values = items.map((item) => {
    if (fieldName === "anxietyLevel" || fieldName === "stressLevel") {
      return normalizeInverted1to10(item[fieldName]);
    }

    if (fieldName === "mood") {
      return getMoodScore100(item.mood);
    }

    return normalizePositive1to10(item[fieldName]);
  });

  const sum = values.reduce((a, b) => a + b, 0);
  return Number((sum / values.length).toFixed(1));
};

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  calculateMentalHealthScore,
  calculateMoodRecoveryScore,
  calculateRecoveryScore,
  calculateCheckInStreak,
  getMoodScore100,
  normalize1to100,
  normalizePositive1to10,
  normalizeInverted1to10,
  calculateMentalHealthTrend,
  calculateSevenDayAverage,
  MOOD_ENUM,
  VALID_LEVELS,
  WELLBEING_WEIGHTS,
  RECOVERY_WEIGHTS,
  averageMetric100,
  formatDate,
};