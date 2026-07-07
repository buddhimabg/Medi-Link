// mood-backend/controllers/moodController.js

const {
  createMoodEntry,
  getDashboardStats,
  getWeeklyChart,
  getMoodHistory,
  getWeeklyInsights,
} = require("../services/moodService.js");
const Mood = require("../models/mood.js");

const { apiSuccess, apiFail } = require("../utils/apiResponse.js");
const { validateCheckInData } = require("../utils/validator.js");

const MOOD_NUMERIC_TO_TEXT = {
  1: "terrible",
  2: "sad",
  3: "okay",
  4: "good",
  5: "great",
};

// Normalize incoming request payload into consistent format
const normalizeMoodPayload = (body = {}) => {
  const moodRaw = body.mood;
  const numericMood = Number(moodRaw);

  return {
    userId: body.userId,
    mood: Number.isNaN(numericMood)
      ? moodRaw
      : MOOD_NUMERIC_TO_TEXT[numericMood] || moodRaw,
    note: body.note,
    sleepLevel: body.sleepLevel ?? body.sleep,
    anxietyLevel: body.anxietyLevel ?? body.anxiety,
    stressLevel: body.stressLevel ?? body.stress,
    energyLevel: body.energyLevel ?? body.energy,
    motivationLevel: body.motivationLevel ?? body.motivation,
    focusLevel: body.focusLevel ?? body.focus,
    socialInteraction: body.socialInteraction ?? body.social,
    // Always default to false on create; change via PATCH /api/moods/:id
    shareWithDoctor: false,
    createdAt: body.createdAt,
    tags: body.tags,

    // AI fields (Optional)
    journalSentimentMood: body.journalSentimentMood,
    journalPrimaryEmotion: body.journalPrimaryEmotion,
    journalEmotionalIntensity: body.journalEmotionalIntensity,
    journalStressLevel: body.journalStressLevel,
    journalTopics: body.journalTopics,
    journalCopingStrategies: body.journalCopingStrategies,
    journalAiSummary: body.journalAiSummary,

    speechTranscript: body.speechTranscript,
    speechSentimentMood: body.speechSentimentMood,
    speechPrimaryEmotion: body.speechPrimaryEmotion,
    speechEmotionalIntensity: body.speechEmotionalIntensity,
    speechStressLevel: body.speechStressLevel,
    speechTopics: body.speechTopics,
    speechCopingStrategies: body.speechCopingStrategies,
    speechAiSummary: body.speechAiSummary,

    cameraDetectedMood: body.cameraDetectedMood,
    cameraConfidence: body.cameraConfidence,

    finalConfirmedMood: body.finalConfirmedMood,
    overallWellbeingScore: body.overallWellbeingScore,
    emotionalRiskLevel: body.emotionalRiskLevel,
  };
};

// POST /api/moods
const createMood = async (req, res) => {
  try {
    const normalizedBody = normalizeMoodPayload(req.body);

    // Validate input
    const validation = validateCheckInData(normalizedBody);
    if (!validation.isValid) {
      return res.status(400).json(
        apiFail("Validation Error", validation.errors)
      );
    }

    const { saved, mentalHealthScore, emotionalRiskLevel, moodInterpretation } = await createMoodEntry(normalizedBody);

    const savedDoc =
      typeof saved?.toObject === "function"
        ? saved.toObject()
        : saved;

    // Compute completion rate based on which level fields are provided (non-null/undefined)
    const levelFields = [
      "sleepLevel",
      "anxietyLevel",
      "energyLevel",
      "motivationLevel",
      "socialInteraction",
      "stressLevel",
      "focusLevel",
    ];
    const providedCount = levelFields.filter((field) => normalizedBody[field] != null).length;
    const completionRate = providedCount / levelFields.length;
    
    res.status(201).json(
      apiSuccess(
        { ...savedDoc, mentalHealthScore, emotionalRiskLevel, moodInterpretation, completionRate },
        "Mood saved successfully"
      )
    );
  } catch (error) {
    res.status(500).json(apiFail("Failed to create mood", error.message));
  }
};

// GET /api/moods/dashboard/:userId
const getDashboard = async (req, res) => {
  try {
    const stats = await getDashboardStats(req.params.userId);
    res.json(apiSuccess(stats, "Dashboard stats retrieved"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to fetch dashboard", error.message));
  }
};

// GET /api/moods/weekly/:userId
const getWeekly = async (req, res) => {
  try {
    const weekly = await getWeeklyChart(req.params.userId);
    res.json(apiSuccess(weekly, "Weekly chart retrieved"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to fetch weekly data", error.message));
  }
};

// GET /api/moods/history/:userId
const getHistory = async (req, res) => {
  try {
    const history = await getMoodHistory(req.params.userId);
    res.json(
      apiSuccess(history.data, `Retrieved ${history.count} mood entries`)
    );
  } catch (error) {
    res.status(500).json(apiFail("Failed to fetch history", error.message));
  }
};

// PATCH /api/moods/:id-Change whether this mood entry can be shared with a doctor
const updateMood = async (req, res) => {
  try {
    const { id } = req.params; // Extract mood entry ID from URL parameters
    const { shareWithDoctor } = req.body; // Extract shareWithDoctor from request body

    if (typeof shareWithDoctor !== "boolean") {
      return res
        .status(400)
        .json(apiFail("shareWithDoctor must be a boolean", null));
    }

    const updateData = { shareWithDoctor };

    const updated = await Mood.findByIdAndUpdate(id, updateData, {
      returnDocument: 'after', // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    });

    if (!updated) {
      return res.status(404).json(apiFail("Mood entry not found", null));
    }

    res.json(apiSuccess(updated, "Mood updated successfully"));
  } catch (error) {
    res.status(400).json(apiFail("Failed to update mood", error.message));
  }
};

// GET /api/moods/insights/:userId
const getInsights = async (req, res) => {
  try {
    const insights = await getWeeklyInsights(req.params.userId);
    res.json(apiSuccess(insights, "Weekly insights retrieved"));
  } catch (error) {
    res
      .status(500)
      .json(apiFail("Failed to fetch insights", error.message));
  }
};

// GET /api/moods/overview/:userId
const getOverview = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [dashboardStats, weeklyChart, insights] = await Promise.all([
      getDashboardStats(userId),
      getWeeklyChart(userId),
      getWeeklyInsights(userId),
    ]);

    res.json(
      apiSuccess(
        { dashboardStats, weeklyChart, insights },
        "Overview data retrieved successfully"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(apiFail("Failed to fetch overview data", error.message));
  }
};

module.exports = {
  createMood,
  getDashboard,
  getWeekly,
  getHistory,
  updateMood,
  getInsights,
  getOverview,
};