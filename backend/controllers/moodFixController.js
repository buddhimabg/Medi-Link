// mood-backend/controllers/moodFixController.js

const MoodFixActivity = require("../models/moodFixActivity");
const MoodFixActivityLog = require("../models/moodFixActivityLog");
const { apiSuccess, apiFail } = require("../utils/apiResponse");

const moodToScore = {
  terrible: 2,
  sad: 4,
  okay: 6,
  good: 8,
  great: 10,
};

const scoreToMood = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null; // invalid input
  if (value <= 2) return "terrible";
  if (value <= 4) return "sad";
  if (value <= 6) return "okay";
  if (value <= 8) return "good";
  return "great";
};

const normalizeMood = (mood) => String(mood || "").trim().toLowerCase(); // Normalize mood input to lowercase string for consistent comparison

const defaultAllowedMoods = Object.keys(moodToScore);

const getAllowedMoods = async () => {
  const moodsFromDb = await MoodFixActivity.distinct("moods", { isActive: true });
  const normalized = (Array.isArray(moodsFromDb) ? moodsFromDb : []) // Normalize and filter out invalid moods
    .map(normalizeMood)
    .filter(Boolean);

  return normalized.length ? [...new Set(normalized)] : defaultAllowedMoods;
};

// GET /api/mood-fix/activities  - Get activity catalog filtered by mood
const getMoodFixActivities = async (req, res) => {
  try {
    const allowedMoods = await getAllowedMoods();
    const mood = normalizeMood(req.query.mood); // read mood from query parameter and normalize
    const query = { isActive: true }; // only return active activities

    if (mood) {
      if (!allowedMoods.includes(mood)) {
        return res.status(400).json(
          apiFail("Invalid mood", {
            allowedMoods,
          })
        );
      }
      query.moods = mood;
    }

    const activities = await MoodFixActivity.find(query)
      .select("activityId title duration difficulty focusTag benefit description moods steps")
      .sort({ title: 1 }); // sort alphabetically by title

    res.json(
      apiSuccess(
        { data: activities, count: activities.length },
        "Mood fix activities retrieved successfully"
      )
    );
  } catch (error) {
    res
      .status(500)
      .json(apiFail("Failed to retrieve mood fix activities", error.message));
  }
};

// POST /api/mood-fix/activities/start - Start an activity for a user
const startMoodFixActivity = async (req, res) => {
  try {
    const { userId, activityId, mood, moodBefore } = req.body; 
    const allowedMoods = await getAllowedMoods();

    if (!userId || !activityId || !mood) {
      return res.status(400).json(
        apiFail("Missing required fields", {
          required: ["userId", "activityId", "mood"],
        })
      );
    }

    const normalizedMood = normalizeMood(mood);
    if (!allowedMoods.includes(normalizedMood)) {
      return res.status(400).json(apiFail("Invalid mood", { allowedMoods }));
    }

    const activity = await MoodFixActivity.findOne({ activityId, isActive: true });
    if (!activity) {
      return res.status(404).json(apiFail("Activity not found", null));
    }

    // Double-check that the activity is actually designed for the specified mood
    if (!Array.isArray(activity.moods) || !activity.moods.includes(normalizedMood)) { 
      return res.status(400).json(
        apiFail("Activity is not available for this mood", {
          activityId,
          mood: normalizedMood,
        })
      );
    }

    const stepsSnapshot = Array.isArray(activity.steps) ? activity.steps : [];

    const resolvedMoodBefore =
      typeof moodBefore === "number" && !Number.isNaN(moodBefore)
        ? moodBefore
        : moodToScore[normalizedMood]; 

    const log = await MoodFixActivityLog.create({
      userId,
      activity: activity._id,
      activityId,
      activityTitle: activity.title,
      moodLabelBefore: normalizedMood,
      moodBefore: resolvedMoodBefore,
      duration: activity.duration || "",
      stepsSnapshot,
      totalSteps: stepsSnapshot.length,
      completedStepIndexes: [],
      lastCompletedStepIndex: -1,
      status: "started",
      startedAt: new Date(),
    });

    res.status(201).json(
      apiSuccess(
        {
          activityLogId: log._id,
          activityId: activity.activityId,
          activityTitle: activity.title,
          totalSteps: log.totalSteps,
          completedSteps: log.completedStepIndexes.length,
          nextStepIndex: 0,
        },
        "Mood fix activity started successfully"
      )
    );
  } catch (error) {
    res.status(500).json(apiFail("Failed to start activity", error.message));
  }
};

// PATCH /api/mood-fix/activities/:id/steps/:stepIndex - Complete one step in order
const completeMoodFixStep = async (req, res) => {
  try {
    const { id } = req.params; //get step id
    const requestedStepIndex = Number.parseInt(req.params.stepIndex, 10); //get step num from url

    if (Number.isNaN(requestedStepIndex) || requestedStepIndex < 0) {
      return res.status(400).json(apiFail("Invalid step index", null));
    }

    const log = await MoodFixActivityLog.findById(id);
    if (!log) {
      return res.status(404).json(apiFail("Activity session not found", null));
    }

    if (log.status === "completed") {
      return res.status(400).json(apiFail("Activity already completed", null));
    }

    const totalSteps = Number.isInteger(log.totalSteps) ? log.totalSteps : 0;
    if (requestedStepIndex >= totalSteps) {
      return res.status(400).json(
        apiFail("Step index out of range", {
          totalSteps,
        })
      );
    }

    const nextExpectedStepIndex = (log.lastCompletedStepIndex ?? -1) + 1;
    if (requestedStepIndex !== nextExpectedStepIndex) {
      return res.status(400).json(
        apiFail("Steps must be completed in order", {
          nextExpectedStepIndex,
        })
      );
    }

    log.completedStepIndexes.push(requestedStepIndex);
    log.lastCompletedStepIndex = requestedStepIndex;
    await log.save();

    const completedSteps = log.completedStepIndexes.length;
    const allStepsCompleted = completedSteps === totalSteps;

    res.json(
      apiSuccess(
        {
          activityLogId: log._id,
          completedSteps,
          totalSteps,
          allStepsCompleted,
          nextStepIndex: allStepsCompleted ? null : requestedStepIndex + 1,
        },
        "Step completed successfully"
      )
    );
  } catch (error) {
    res.status(500).json(apiFail("Failed to complete step", error.message));
  }
};

// PATCH /api/mood-fix/activities/:id/complete - Complete activity and mark mood after
const completeMoodFixActivity = async (req, res) => {
  try {
    const { id } = req.params; 
    const { moodAfter} = req.body; 

    const log = await MoodFixActivityLog.findById(id);
    if (!log) {
      return res.status(404).json(apiFail("Activity session not found", null));
    }

    if (log.status === "completed") {
      return res.status(400).json(apiFail("Activity already completed", null));
    }

    const totalSteps = Number.isInteger(log.totalSteps) ? log.totalSteps : 0;
    const completedSteps = Array.isArray(log.completedStepIndexes)
      ? log.completedStepIndexes.length
      : 0;

    if (completedSteps !== totalSteps) {
      return res.status(400).json(
        apiFail("Complete all steps before submitting mood after", {
          completedSteps,
          totalSteps,
        })
      );
    }

    if (typeof moodAfter !== "number" || Number.isNaN(moodAfter)) {
      return res.status(400).json(apiFail("moodAfter is required", null));
    }

    log.moodAfter = moodAfter;
    log.moodLabelAfter = scoreToMood(moodAfter);
    log.feedback = feedback || "";
    log.rating = typeof rating === "number" ? rating : null;
    log.status = "completed";
    log.completedAt = new Date();

    await log.save();

    res.json(apiSuccess(log, "Activity completed successfully"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to complete activity", error.message));
  }
};

module.exports = {
  getMoodFixActivities,
  startMoodFixActivity,
  completeMoodFixStep,
  completeMoodFixActivity,
};