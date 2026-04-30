const mongoose = require("mongoose");

const topFactorSchema = new mongoose.Schema(
  {
    key: { type: String, default: "" },
    name: { type: String, default: "" },
    change: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    absoluteImpact: { type: Number, default: 0 },
  },
  { _id: false }
);

const factorInsightSchema = new mongoose.Schema(
  {
    factor: { type: String, default: "" },
    label: { type: String, default: "" },
    change: { type: Number, default: 0 },
    factorChangePct: { type: Number, default: 0 },
    impactScore: { type: Number, default: 0 },
    direction: { type: String, default: "neutral" },
    message: { type: String, default: "" },
    researchBasis: { type: String, default: "" },
    absoluteImpact: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailyTrendSchema = new mongoose.Schema(
  {
    day: { type: String, default: "" },
    date: { type: String, default: "" },
    score: { type: Number, default: null },
    entries: { type: Number, default: 0 },
  },
  { _id: false }
);

const patternSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    detected: { type: Boolean, default: false },
    message: { type: String, default: "" },
  },
  { _id: false }
);

const correlationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "" },
    detected: { type: Boolean, default: false },
    message: { type: String, default: "" },
    matchCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    matchPct: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailyInsightSchema = new mongoose.Schema(
  {
    date: { type: String, default: "" },
    message: { type: String, default: "" },
    highlights: { type: [String], default: [] },
  },
  { _id: false }
);

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastGeneratedDate: {
      type: String,
      default: "",
      index: true,
    },
    period: {
      currentStart: Date,
      currentEnd: Date,
      previousStart: Date,
      previousEnd: Date,
    },
    sourceEntryCount: {
      type: Number,
      default: 0,
      index: true,
    },
    sourceLastEntryAt: {
      type: Date,
      default: null,
      index: true,
    },
    summary: { type: String, default: "" },
    simpleMessage: { type: String, default: "" },
    overallTrend: { type: String, default: "stable" },
    overallChange: { type: Number, default: 0 },
    moodTrend: { type: String, default: "stable" },
    summaryText: { type: String, default: "" },
    overallMoodTrend: { type: String, default: "stable" },
    moodChange: { type: Number, default: 0 },
    confidenceLevel: { type: String, default: "Low" },
    patterns: {
      type: [patternSchema],
      default: [],
    },
    correlationInsights: {
      type: [correlationSchema],
      default: [],
    },
    riskAlerts: {
      type: [String],
      default: [],
    },
    recovery: {
      overallScore: { type: Number, default: 0 },
      change: { type: Number, default: 0 },
    },
    weeklyComparison: {
      thisWeekMoodAvg: { type: Number, default: 0 },
      lastWeekMoodAvg: { type: Number, default: 0 },
      moodChangePct: { type: Number, default: 0 },
      trend: { type: String, default: "stable" },
      simpleMessage: { type: String, default: "" },
    },
    topFactors: {
      type: [topFactorSchema],
      default: [],
    },
    topPositiveFactor: {
      type: factorInsightSchema,
      default: null,
    },
    topNegativeFactor: {
      type: factorInsightSchema,
      default: null,
    },
    factorInsights: {
      type: [factorInsightSchema],
      default: [],
    },
    factorChanges: {
      type: [factorInsightSchema],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    dailyInsight: {
      type: dailyInsightSchema,
      default: () => ({}),
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dailyTrend: {
      type: [dailyTrendSchema],
      default: [],
    },
    bestDay: {
      day: { type: String, default: "" },
      date: { type: String, default: "" },
      score: { type: Number, default: null },
      entries: { type: Number, default: 0 },
    },
    worstDay: {
      day: { type: String, default: "" },
      date: { type: String, default: "" },
      score: { type: Number, default: null },
      entries: { type: Number, default: 0 },
    },
    peakDays: {
      bestDay: {
        day: { type: String, default: "" },
        date: { type: String, default: "" },
        score: { type: Number, default: null },
        entries: { type: Number, default: 0 },
      },
      worstDay: {
        day: { type: String, default: "" },
        date: { type: String, default: "" },
        score: { type: Number, default: null },
        entries: { type: Number, default: 0 },
      },
    },
    moodDistribution: {
      terrible: { type: Number, default: 0 },
      sad: { type: Number, default: 0 },
      okay: { type: Number, default: 0 },
      good: { type: Number, default: 0 },
      great: { type: Number, default: 0 },
    },

    // Legacy-compatible shape used by existing frontend history analytics.
    weeklySummary: {
      averageMoodScore: { type: Number, default: 0 },
      totalCheckIns: { type: Number, default: 0 },
      bestDay: {
        day: { type: String, default: "" },
        date: { type: String, default: "" },
        averageMoodScore: { type: Number, default: 0 },
        entries: { type: Number, default: 0 },
      },
      dailyMoodAverages: {
        type: [
          {
            day: { type: String, default: "" },
            date: { type: String, default: "" },
            averageMoodScore: { type: Number, default: 0 },
            entries: { type: Number, default: 0 },
          },
        ],
        default: [],
      },
    },
    recoveryProgress: {
      overallRecoveryScore: { type: Number, default: 0 },
      overallRecoveryChangePct: { type: Number, default: 0 },
      sleepQualityIncreasePct: { type: Number, default: 0 },
      anxietyLevelDecreasePct: { type: Number, default: 0 },
      stressLevelDecreasePct: { type: Number, default: 0 },
      energyLevelIncreasePct: { type: Number, default: 0 },
      motivationLevelIncreasePct: { type: Number, default: 0 },
      focusLevelIncreasePct: { type: Number, default: 0 },
      socialInteractionIncreasePct: { type: Number, default: 0 },
      currentAverages: {
        overallRecovery: { type: Number, default: 0 },
        sleepLevel: { type: Number, default: 0 },
        anxietyLevel: { type: Number, default: 0 },
        stressLevel: { type: Number, default: 0 },
        energyLevel: { type: Number, default: 0 },
        motivationLevel: { type: Number, default: 0 },
        focusLevel: { type: Number, default: 0 },
        socialInteraction: { type: Number, default: 0 },
      },
      previousAverages: {
        overallRecovery: { type: Number, default: 0 },
        sleepLevel: { type: Number, default: 0 },
        anxietyLevel: { type: Number, default: 0 },
        stressLevel: { type: Number, default: 0 },
        energyLevel: { type: Number, default: 0 },
        motivationLevel: { type: Number, default: 0 },
        focusLevel: { type: Number, default: 0 },
        socialInteraction: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

const Insight = mongoose.model("Insight", insightSchema);

module.exports = Insight;
