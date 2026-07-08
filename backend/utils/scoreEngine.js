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

// Weights (normalized automatically later)
const RECOVERY_WEIGHTS = {
  sleep: 0.15,
  anxiety: 0.15,
  stress: 0.15,
  energy: 0.12,
  social: 0.07,
  mood: 0.2
};

const NEGATIVE_IMPACT = 0.5;
const NORMALIZATION_FACTOR = 0.75;

// ==========================================
// HELPERS
// ==========================================

/**
 * Maps mood string to normalized 0-10 value. Falls back to default 5 (neutral) if mood is unknown or missing.
 */
const getMoodValue = (mood) => {
  const score100 = MOOD_SCORE_MAP_100[mood?.toLowerCase()];
  if (score100 === undefined) return 5;

  return score100 / 10; // convert to 0–10 scale
};

/**
 * Safely parses numeric metric levels. Falls back to default 5 (neutral) if value is null, undefined, or NaN.
 */
const num = (v, def = 5) => {
  if (v === null || v === undefined || v === "") return def;
  const n = Number(v);
  return isNaN(n) ? def : n;
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

const calculateMentalHealthScore = (m) => {
  const moodValue = getMoodValue(m.mood);

  const sleep = Math.max(1, Math.min(10, num(m.sleepLevel)));
  const energy = Math.max(1, Math.min(10, num(m.energyLevel)));
  const motivation = Math.max(1, Math.min(10, num(m.motivationLevel)));
  const social = Math.max(1, Math.min(10, num(m.socialInteraction)));
  const focus = Math.max(1, Math.min(10, num(m.focusLevel)));
  const anxiety = Math.max(1, Math.min(10, num(m.anxietyLevel)));
  const stress = Math.max(1, Math.min(10, num(m.stressLevel)));

  const positive =
    moodValue * 0.15 +
    sleep * 0.12 +
    energy * 0.1 +
    motivation * 0.1 +
    social * 0.1 +
    focus * 0.08;

  const negative = anxiety * 0.2 + stress * 0.15;

  let score =
    (positive - negative * NEGATIVE_IMPACT) / NORMALIZATION_FACTOR;

  score = Math.max(0, Math.min(10, score));
  return Number(score.toFixed(1));
};

// ==========================================
// NORMALIZATION
// ==========================================

const normalizeMetric = (value, min, max, inverse = false) => {
  const val = num(value, 5);
  const clamped = Math.max(min, Math.min(max, val));
  let score = ((clamped - min) / (max - min)) * 100;
  return inverse ? 100 - score : score;
};

const calculateMoodScore = (mood) => {
  return MOOD_SCORE_MAP_100[mood?.toLowerCase()] ?? 50;
};

// ==========================================
// RECOVERY SCORE
// ==========================================

const calculateMoodRecoveryScore = (m) => {
  const sleep = normalizeMetric(num(m.sleepLevel), 0, 10);
  const anxiety = normalizeMetric(num(m.anxietyLevel), 0, 10, true);
  const stress = normalizeMetric(num(m.stressLevel), 0, 10, true);
  const energy = normalizeMetric(num(m.energyLevel), 0, 10);
  const social = normalizeMetric(num(m.socialInteraction), 0, 10);
  const moodScore = calculateMoodScore(m.mood);

  const weighted =
    sleep * RECOVERY_WEIGHTS.sleep +
    anxiety * RECOVERY_WEIGHTS.anxiety +
    stress * RECOVERY_WEIGHTS.stress +
    energy * RECOVERY_WEIGHTS.energy +
    social * RECOVERY_WEIGHTS.social +
    moodScore * RECOVERY_WEIGHTS.mood;

  // normalize weights
  const totalWeight = Object.values(RECOVERY_WEIGHTS).reduce(
    (a, b) => a + b,
    0
  );

  const finalScore = weighted / totalWeight;

  return Number(finalScore.toFixed(1));
};

const calculateRecoveryScore = (moods) => {
  if (!moods.length) return 0;

  const scores = moods.map(calculateMoodRecoveryScore);
  const avg =
    scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return Math.round(avg);
};

// ==========================================
// STREAK
// ==========================================

const calculateCheckInStreak = (moods) => {
  if (!moods.length) return 0;

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

const getMoodScore100 = (mood) => {
  return MOOD_SCORE_MAP_100[mood?.toLowerCase()] ?? 60;
};

const normalize1to100 = (value) => {
  const val = num(value, 5);
  const clamped = Math.max(1, Math.min(10, val));
  return clamped * 10;
};

const calculateMentalHealthTrend = (m) => {
  const sleepScore = normalize1to100(m.sleepLevel);
  const energyScore = normalize1to100(m.energyLevel);
  const motivationScore = normalize1to100(m.motivationLevel);
  const socialScore = normalize1to100(m.socialInteraction);
  const focusScore = normalize1to100(m.focusLevel);

  const anxietyScore = 100 - normalize1to100(m.anxietyLevel);
  const stressScore = 100 - normalize1to100(m.stressLevel);

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

const calculateSevenDayAverage = (moods) => {
  if (!moods.length) return 0;

  const validScores = moods
    .map((m) => m.mentalHealthScore || calculateMentalHealthScore(m))
    .filter((s) => s > 0);

  if (!validScores.length) return 0;

  const avg =
    validScores.reduce((a, b) => a + b, 0) / validScores.length;

  return Number(avg.toFixed(1));
};

const averageMetric100 = (items, fieldName) => {
  if (!items.length) return 0;

  const values = items.map((item) => {
    const val = num(item[fieldName], 5);

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
// EXPORTS
// ==========================================

module.exports = {
  calculateMentalHealthScore,
  calculateRecoveryScore,
  calculateCheckInStreak,
  getMoodScore100,
  normalize1to100,
  calculateMentalHealthTrend,
  calculateSevenDayAverage,
  MOOD_ENUM,
  VALID_LEVELS,
  averageMetric100,
  formatDate,
};