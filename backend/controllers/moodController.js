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

    const { saved, mentalHealthScore } = await createMoodEntry(normalizedBody);

    const savedDoc =
      typeof saved?.toObject === "function"
        ? saved.toObject()
        : saved;

    res.status(201).json(
      apiSuccess(
        { ...savedDoc, mentalHealthScore },
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
      new: true, // Return the updated document
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

module.exports = {
  createMood,
  getDashboard,
  getWeekly,
  getHistory,
  updateMood,
  getInsights,
};