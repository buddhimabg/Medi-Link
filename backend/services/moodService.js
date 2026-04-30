// mood-backend/services/moodService.js

const Mood = require("../models/mood");
const Insight = require("../models/insight");
const { buildMoodInsights } = require("../utils/insightEngine");
const {
  calculateMentalHealthScore,
  calculateRecoveryScore,
  calculateCheckInStreak,
  calculateSevenDayAverage,
  formatDate,
} = require("../utils/scoreEngine");

/* =====================================================
   CONSTANTS
===================================================== */


const ONE_DAY_MS = 86400000;


const WEEK_DAYS = 7;


const INSIGHT_DAYS = 13;


const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* =====================================================
   VALIDATE INSIGHT STRUCTURE
   Checks whether saved insight contains full data
===================================================== */
const hasEnhancedInsightShape = (insight) => {
  if (!insight || typeof insight !== "object") return false;

  const hasSummary =
    typeof insight.summaryText === "string" ||
    typeof insight.summary === "string";

  const hasTrend =
    typeof insight.overallMoodTrend === "string" ||
    typeof insight.moodTrend === "string" ||
    typeof insight.overallTrend === "string";

  return (
    hasSummary &&
    hasTrend &&
    Array.isArray(insight.factorInsights) &&
    Array.isArray(insight.factorChanges) &&
    Array.isArray(insight.recommendations) &&
    Array.isArray(insight.dailyTrend) &&
    insight.weeklyComparison &&
    typeof insight.weeklyComparison === "object" &&
    Array.isArray(insight.correlationInsights) &&
    Array.isArray(insight.riskAlerts) &&
    insight.dailyInsight &&
    typeof insight.dailyInsight === "object" &&
    insight.metrics &&
    typeof insight.metrics === "object" &&
    Array.isArray(insight.patterns) &&
    typeof insight.confidenceLevel === "string" &&
    insight.bestDay &&
    typeof insight.bestDay === "object"
  );
};

/* =====================================================
   CREATE MOOD ENTRY
   Save mood record and calculate score
===================================================== */
const createMoodEntry = async (data) => {
  const mood = new Mood(data);
  const saved = await mood.save();

  const mentalHealthScore = calculateMentalHealthScore(saved);

  return { saved, mentalHealthScore };
};

/* =====================================================
   DASHBOARD STATS
   Returns:
   - 7 day average score
   - Check-in streak
   - Recovery score
===================================================== */
const getDashboardStats = async (userId) => {
  const moods = await Mood.find({ userId })
    .sort({ createdAt: -1 }) // get latest entries first for easier processing of streaks and recent data
    .lean();

  // If no mood entries found
  if (!moods.length) {
    return {
      sevenDayAverage: 0,
      checkInStreak: 0,
      recoveryScore: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0); 

  // Start date for last 7 days
  const last7Days = new Date(
    today.getTime() - (WEEK_DAYS - 1) * ONE_DAY_MS
  );

  // Filter only recent mood entries
  const moodsLast7Days = moods.filter((mood) => {
    const moodDate = new Date(mood.createdAt);

    return (
      moodDate >= last7Days &&
      moodDate <= new Date(today.getTime() + ONE_DAY_MS - 1)
    );
  });

  return {
    sevenDayAverage: calculateSevenDayAverage(moodsLast7Days),
    checkInStreak: calculateCheckInStreak(moods),
    recoveryScore: calculateRecoveryScore(moodsLast7Days),
  };
};

/* =====================================================
   WEEKLY CHART
   Returns last 7 days graph data
===================================================== */
const getWeeklyChart = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sixDaysAgo = new Date(today);
  sixDaysAgo.setDate(today.getDate() - (WEEK_DAYS - 1));

  const moods = await Mood.find({
    userId,
    createdAt: {
      $gte: sixDaysAgo,
      $lte: new Date(today.getTime() + ONE_DAY_MS - 1),
    },
  }).lean();

  // Group moods by date
  const grouped = {};

  moods.forEach((mood) => {
    const date = formatDate(mood.createdAt);

    if (!grouped[date]) grouped[date] = [];

    grouped[date].push(mood);
  });

  const result = [];

  // Build chart data for each day
  for (let i = 0; i < WEEK_DAYS; i++) {
    const currentDate = new Date(sixDaysAgo); 
    currentDate.setDate(sixDaysAgo.getDate() + i);

    const dateStr = formatDate(currentDate);

    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");

    const dayName = DAY_NAMES[currentDate.getDay()];
    const displayDate = `${dayName} ${month}-${day}`;

    if (grouped[dateStr]) {
      const entries = grouped[dateStr];

      const totalScore = entries.reduce((sum, mood) => {
        return sum + calculateMentalHealthScore(mood);
      }, 0);

      const average = totalScore / entries.length;

      result.push({
        day: dayName,
        displayDate,
        fullDate: dateStr,
        value: Number(average.toFixed(1)),
        hasData: true,
        entries: entries.length,
      });
    } else {
      result.push({
        day: dayName,
        displayDate,
        fullDate: dateStr,
        value: 0,
        hasData: false,
        entries: 0,
      });
    }
  }

  return result;
};

/* =====================================================
   MOOD HISTORY
   Returns all mood records
===================================================== */
const getMoodHistory = async (userId) => {
  const moods = await Mood.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  return {
    success: true,
    count: moods.length,
    data: moods,
  };
};

/* =====================================================
   WEEKLY INSIGHTS
   Current 7 days vs previous 7 days
===================================================== */
const getWeeklyInsights = async (userId) => {
  const now = new Date();
  const todayKey = formatDate(now);

  // Fetch required data together(old saved insight + latest mood entry + total count) 
  const [existingInsight, latestEntry, entryCount] = await Promise.all([
    Insight.findOne({ userId }).lean(),
    Mood.findOne({ userId })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1 })
      .lean(),
    Mood.countDocuments({ userId }),
  ]);

  const latestCreatedAt = latestEntry?.createdAt
    ? new Date(latestEntry.createdAt)
    : null;

  // Return cached insight if still valid
  if (
    existingInsight &&
    hasEnhancedInsightShape(existingInsight) &&
    existingInsight.lastGeneratedDate === todayKey &&
    existingInsight.sourceEntryCount === entryCount &&
    (
      (existingInsight.sourceLastEntryAt === null &&
        latestCreatedAt === null) ||
      (
        existingInsight.sourceLastEntryAt &&
        latestCreatedAt &&
        new Date(existingInsight.sourceLastEntryAt).getTime() ===
          latestCreatedAt.getTime()
      )
    )
  ) {
    return existingInsight;
  }

  // Get last 14 days data
  const startWindow = new Date(now);
  startWindow.setDate(now.getDate() - INSIGHT_DAYS);
  startWindow.setHours(0, 0, 0, 0);

  const periodEntries = await Mood.find({
    userId,
    createdAt: {
      $gte: startWindow,
      $lte: now,
    },
  })
    .sort({ createdAt: -1 })
    .lean();

  // Generate insights
  const computed = buildMoodInsights(periodEntries, { now });

  const payload = {
    ...computed,

    summary: computed.summary,
    overallTrend: computed.overallTrend,
    overallChange: computed.overallChange,

    summaryText: computed.summary,
    overallMoodTrend: computed.overallTrend,
    moodTrend: computed.overallTrend,
    moodChange: computed.overallChange,

    userId,
    lastGeneratedDate: todayKey,
    sourceEntryCount: entryCount,
    sourceLastEntryAt: latestCreatedAt,
  };

  // Save / update insight
  const savedInsight = await Insight.findOneAndUpdate(
    { userId },
    payload,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

    return savedInsight;
  };

  module.exports = {
    createMoodEntry,
    getDashboardStats,
    getWeeklyChart,
    getMoodHistory,
    getWeeklyInsights,
  };