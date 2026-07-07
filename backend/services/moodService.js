// mood-backend/services/moodService.js

const Mood = require("../models/mood");
const Insight = require("../models/insight");
const { buildMoodInsights } = require("../utils/insightEngine");
const FactorMeta = require("../models/FactorMeta");
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
   Calculate score BEFORE saving and store with document
===================================================== */
const createMoodEntry = async (data) => {
  // Create temporary document to calculate score
  const tempMood = new Mood(data);
  
  // Calculate score before saving
  const mentalHealthScore = calculateMentalHealthScore(tempMood);
  
  // Add score to data
  tempMood.mentalHealthScore = mentalHealthScore;
  
  // Save document with score
  const saved = await tempMood.save();

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
  const today = new Date();
  today.setHours(0, 0, 0, 0); 
  const last7Days = new Date(today.getTime() - (WEEK_DAYS - 1) * ONE_DAY_MS);

  // Fetch only recent full moods for average/recovery, and only dates for streak
  const [recentMoods, allMoodDates] = await Promise.all([
    Mood.find({
      userId,
      createdAt: {
        $gte: last7Days,
        $lte: new Date(today.getTime() + ONE_DAY_MS - 1)
      }
    }).sort({ createdAt: -1 }).lean(),
    Mood.find({ userId })
      .select({ createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean()
  ]);

  // If no mood entries found
  if (!allMoodDates.length) {
    return {
      sevenDayAverage: 0,
      checkInStreak: 0,
      recoveryScore: 0,
    };
  }

  return {
    sevenDayAverage: calculateSevenDayAverage(recentMoods),
    checkInStreak: calculateCheckInStreak(allMoodDates),
    recoveryScore: calculateRecoveryScore(recentMoods),
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

      // Use stored mentalHealthScore instead of calculating
      const totalScore = entries.reduce((sum, mood) => {
        return sum + (mood.mentalHealthScore || calculateMentalHealthScore(mood));
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
   Returns mood records with optimized fields
===================================================== */
const getMoodHistory = async (userId, limit = 50, skip = 0) => {
  const totalCount = await Mood.countDocuments({ userId });
  
  const moods = await Mood.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select({
      mood: 1,
      mentalHealthScore: 1,  // Get stored score (no calculation needed)
      sleepLevel: 1,
      anxietyLevel: 1,
      energyLevel: 1,
      motivationLevel: 1,
      focusLevel: 1,
      socialInteraction: 1,
      stressLevel: 1,
      note: 1,
      tags: 1,
      createdAt: 1,
      // Exclude: shareWithDoctor (not needed for history display)
    })
    .lean();

  return {
    success: true,
    count: moods.length,
    total: totalCount,
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

  const latestEntryTimestamp = latestCreatedAt ? latestCreatedAt.getTime() : 0;
  const currentCacheKey = `${todayKey}_${latestEntryTimestamp}`;

  // Return cached insight if still valid
  if (
    existingInsight &&
    hasEnhancedInsightShape(existingInsight) &&
    existingInsight.cacheKey === currentCacheKey
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

  // Load factor meta from DB (if available) and generate insights
  const metas = await FactorMeta.find({}).lean();
  const factorMetaMap = metas.reduce((acc, m) => {
    acc[m.key] = m;
    return acc;
  }, {});

  const computed = buildMoodInsights(periodEntries, { now, factorMeta: factorMetaMap });

  const payload = {
    ...computed,

    summary: computed.summary || computed.summaryText,
    overallTrend: computed.overallTrend || computed.overallMoodTrend,

    summaryText: computed.summaryText || computed.summary,
    overallMoodTrend: computed.overallMoodTrend || computed.overallTrend,
    moodTrend: computed.overallMoodTrend || computed.overallTrend,
    moodChange: computed.moodChange || computed.overallChange,
    factorMeta: metas,

    userId,
    lastGeneratedDate: todayKey,
    cacheKey: currentCacheKey,
  };

  // Save / update insight
  const savedInsight = await Insight.findOneAndUpdate(
    { userId },
    payload,
    {
      upsert: true,
      returnDocument: 'after',
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