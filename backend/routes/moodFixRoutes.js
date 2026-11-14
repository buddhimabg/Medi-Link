// mood-backend/routes/moodFixRoutes.js

const express = require("express");
const {
  getMoodFixActivities,
  startMoodFixActivity,
  completeMoodFixStep,
  completeMoodFixActivity,
  saveMoodAfterFeedback,
} = require("../controllers/moodFixController.js");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");

const router = express.Router();

// Get all activity catalog entries
router.get("/activities", asyncHandler(getMoodFixActivities));

// Start mood fix activity
router.post("/activities/start", asyncHandler(startMoodFixActivity));

// Complete one activity step in strict order
router.patch("/activities/:id/steps/:stepIndex", asyncHandler(completeMoodFixStep));

// Complete activity and submit mood after
router.patch("/activities/:id/complete", asyncHandler(completeMoodFixActivity));

// Save mood feedback after activity (frontend-only tracking)
router.post("/feedback", asyncHandler(saveMoodAfterFeedback));

module.exports = router;
