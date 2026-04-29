// mood-backend/utils/scoreEngine.js

/**
 * SINGLE SOURCE OF TRUTH for all mood scoring calculations
 * Used by: moodService.js, dashboard stats, recovery scores, streak logic
 */

// ==========================================
// HELPERS
// ==========================================

/**
 * Convert mood text to numeric value
 */
const getMoodValue = (mood) => {
  const moodMap = {
    terrible: 2,
    sad: 4,
    okay: 6,
    good: 8,
    great: 10
  };

  return moodMap[mood?.toLowerCase()] ?? 5;
};

/**
 * Safe number conversion with fallback
 */
const num = (v, def = 5) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

/**
 * Format date to YYYY-MM-DD (local timezone)
 */
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// ==========================================
// CORE CALCULATION
// ==========================================

/**
 * Calculate mental health score (0–10)
 */
const calculateMentalHealthScore = (m) => {
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
 * Calculate recovery score (0–100)
 */
const calculateRecoveryScore = (moods) => {
  if (!moods.length) return 0;

  let good = 0;
  let total = 0;

  moods.forEach((m) => {
    const sleep = num(m.sleepLevel);
    const anxiety = num(m.anxietyLevel);
    const energy = num(m.energyLevel);
    const social = num(m.socialInteraction);
    const stress = num(m.stressLevel);
    const mood = m.mood?.toLowerCase();

    if (sleep >= 7) good++; 
    total++;

    if (anxiety <= 4) good++; 
    total++;

    if (energy >= 6) good++; 
    total++;

    if (social >= 5) good++; 
    total++;

    if (mood === "good" || mood === "great") good++; 
    total++;

    if (stress <= 4) good++; 
    total++;
  });

  return Math.round((good / total) * 100);
};

/**
 * Calculate check-in streak
 */
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

/**
 * Mood to 0–100 scale
 */
const getMoodScore100 = (mood) => {
  const map = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100
  };

  return map[mood?.toLowerCase()] ?? 60;
};

/**
 * Normalize 1–10 → 0–100
 */
const normalize1to100 = (value) => {
  const v = num(value, 5);
  return v * 10;
};

/**
 * Mental health trend score (0–100)
 */
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

/**
 * 7-day average mental health score
 */
const calculateSevenDayAverage = (moods) => {
  if (!moods.length) return 0;

  const validScores = moods
    .map((m) => calculateMentalHealthScore(m))
    .filter((s) => s > 0);

  if (!validScores.length) return 0;

  const avg =
    validScores.reduce((a, b) => a + b, 0) / validScores.length;

  return Number(avg.toFixed(1));
};

// ==========================================
// CONSTANTS
// ==========================================

const MOOD_ENUM = ["terrible", "sad", "okay", "good", "great"];

const VALID_LEVELS = {
  min: 1,
  max: 10
};

/**
 * Generic metric averaging (0–100)
 */
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