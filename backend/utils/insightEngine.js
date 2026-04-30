const { formatDate } = require("./scoreEngine.js");

/**
 * =========================
 * CONSTANTS
 * =========================
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEIGHTS = {
  mood: 0.2,
  sleep: 0.15,
  anxiety: 0.15,
  stress: 0.15,
  energy: 0.12,
  motivation: 0.1,
  focus: 0.08,
  social: 0.05,
};

const NEGATIVE_FACTORS = ["anxiety", "stress"];

const FACTOR_LABELS = {
  mood: "Mood",
  sleep: "Sleep",
  anxiety: "Anxiety",
  stress: "Stress",
  energy: "Energy",
  motivation: "Motivation",
  focus: "Focus",
  social: "Social Connection",
};

const FACTOR_RULE_ORDER = [
  "sleep",
  "energy",
  "motivation",
  "social",
  "focus",
  "stress",
  "anxiety",
];

/**
 * =========================
 * HELPERS (safe + reused)
 * =========================
 */

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round1 = (v = 0) => Number(v.toFixed(1));

const safeNumber = (v, fallback = null) => {
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};

const average = (arr) => {
  const valid = arr.filter((v) => typeof v === "number" && !Number.isNaN(v));
  return valid.length ? round1(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
};

const percentChange = (cur, prev) => {
  if (typeof prev !== "number" || prev === 0) return 0;
  return round1(((cur - prev) / prev) * 100);
};

const toMood100 = (mood) => {
  if (typeof mood === "number") return clamp(mood, 1, 5) * 20;

  const map = {
    terrible: 20,
    sad: 40,
    okay: 60,
    good: 80,
    great: 100,
  };

  return map[String(mood || "").toLowerCase()] ?? 60;
};

const toMood5 = (mood) => {
  if (typeof mood === "number") return clamp(Math.round(mood), 1, 5);

  const map = {
    terrible: 1,
    sad: 2,
    okay: 3,
    good: 4,
    great: 5,
  };

  return map[String(mood || "").toLowerCase()] ?? 3;
};

const toLevel100 = (v, min = 0, max = 10) => {
  const n = safeNumber(v);
  return n === null ? null : clamp(n, min, max) * 10;
};

/**
 * =========================
 * CORE NORMALIZER
 * =========================
 */

const normalizeEntry = (entry) => {
  const mood = toMood100(entry.mood);

  const sleep = toLevel100(entry.sleepLevel ?? entry.sleep) ?? 50;
  const energy = toLevel100(entry.energyLevel ?? entry.energy) ?? 50;
  const motivation = toLevel100(entry.motivationLevel ?? entry.motivation) ?? 50;
  const focus = toLevel100(entry.focusLevel ?? entry.focus) ?? 50;
  const social = toLevel100(entry.socialInteraction ?? entry.social) ?? 50;

  const anxietyRaw = toLevel100(entry.anxietyLevel ?? entry.anxiety);
  const stressRaw = toLevel100(entry.stressLevel ?? entry.stress);

  const anxiety = anxietyRaw === null ? 50 : 100 - anxietyRaw;
  const stress = stressRaw === null ? 50 : 100 - stressRaw;

  const wellbeing =
    mood * WEIGHTS.mood +
    sleep * WEIGHTS.sleep +
    anxiety * WEIGHTS.anxiety +
    stress * WEIGHTS.stress +
    energy * WEIGHTS.energy +
    motivation * WEIGHTS.motivation +
    focus * WEIGHTS.focus +
    social * WEIGHTS.social;

  return {
    mood,
    sleep,
    anxiety,
    stress,
    energy,
    motivation,
    focus,
    social,
    overall: round1(wellbeing),
    raw: {
      sleep: entry.sleepLevel ?? entry.sleep,
      anxiety: entry.anxietyLevel ?? entry.anxiety,
      stress: entry.stressLevel ?? entry.stress,
      energy: entry.energyLevel ?? entry.energy,
      motivation: entry.motivationLevel ?? entry.motivation,
      focus: entry.focusLevel ?? entry.focus,
      social: entry.socialInteraction ?? entry.social,
    },
  };
};

/**
 * =========================
 * TIME SPLIT
 * =========================
 */

const splitByPeriod = (entries, now = new Date()) => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(today.getDate() - 6);

  const currentEnd = new Date(today.getTime() + 86400000 - 1);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(currentStart.getDate() - 1);
  previousEnd.setHours(23, 59, 59, 999);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);

  const currentWeek = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= currentStart && d <= currentEnd;
  });

  const previousWeek = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= previousStart && d <= previousEnd;
  });

  return { today, currentStart, currentEnd, previousStart, previousEnd, currentWeek, previousWeek };
};

/**
 * =========================
 * AGGREGATION
 * =========================
 */

const aggregateMetrics = (entries) => {
  const normalized = entries.map(normalizeEntry);

  const fields = ["mood", "sleep", "anxiety", "stress", "energy", "motivation", "focus", "social", "overall"];

  const result = {};
  for (const f of fields) {
    result[f] = average(normalized.map((e) => e[f]));
  }

  return { ...result, normalized };
};

/**
 * =========================
 * PATTERNS + INSIGHTS
 * =========================
 */

const buildPatterns = (normalized) => {
  const avg = (key) => average(normalized.map((e) => e.raw[key]));

  const sleep = avg("sleep");
  const energy = avg("energy");
  const stress = avg("stress");
  const anxiety = avg("anxiety");
  const motivation = avg("motivation");
  const focus = avg("focus");
  const social = avg("social");

  const patterns = [];

  if ((sleep ?? 100) < 50 && (energy ?? 100) < 50) {
    patterns.push({ type: "Fatigue Pattern", detected: true });
  }

  if ((stress ?? 0) > 60) {
    patterns.push({ type: "Stress Overload", detected: true });
  }

  if ((anxiety ?? 0) > 60) {
    patterns.push({ type: "Anxiety Pattern", detected: true });
  }

  if ((motivation ?? 100) < 50 && (focus ?? 100) < 50) {
    patterns.push({ type: "Burnout Pattern", detected: true });
  }

  if ((social ?? 100) < 50) {
    patterns.push({ type: "Social Isolation", detected: true });
  }

  return { patterns, rawAverages: { sleep, energy, stress, anxiety, motivation, focus, social } };
};

/**
 * =========================
 * MAIN ENGINE
 * =========================
 */

const buildMoodInsights = (entries = [], options = {}) => {
  const now = options.now ? new Date(options.now) : new Date();
  const safe = Array.isArray(entries) ? entries : [];

  const { currentWeek, previousWeek, currentStart, currentEnd, previousStart, previousEnd } =
    splitByPeriod(safe, now);

  const current = aggregateMetrics(currentWeek);
  const previous = aggregateMetrics(previousWeek);

  const currentScore = current.overall ?? 0;
  const previousScore = previous.overall ?? 0;

  const change = percentChange(currentScore, previousScore);

  const trend =
    change > 5 ? "improving" : change < -5 ? "declining" : "stable";

  const { patterns, rawAverages } = buildPatterns(current.normalized);

  return {
    generatedAt: now.toISOString(),
    period: {
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    },

    summary:
      trend === "improving"
        ? "Wellbeing improved this week."
        : trend === "declining"
        ? "Wellbeing declined this week."
        : "Wellbeing stayed stable this week.",

    overallTrend: trend,
    overallChange: change,

    metrics: {
      currentWeek: current,
      previousWeek: previous,
    },

    patterns,

    recommendations: [
      rawAverages.sleep < 60 && "Improve sleep consistency.",
      rawAverages.stress > 60 && "Reduce stress with breaks and breathing.",
      rawAverages.anxiety > 60 && "Try mindfulness or relaxation.",
    ].filter(Boolean),
  };
};

module.exports = { buildMoodInsights };