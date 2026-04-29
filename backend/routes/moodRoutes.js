// mood-backend/routes/moodRoutes.js

const express = require("express");
const {
  createMood,
  updateMood,
  getDashboard,
  getWeekly,
  getHistory,
  getInsights,
} = require("../controllers/moodController.js");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");

const router = express.Router();

router.post("/", asyncHandler(createMood));
router.patch("/:id", asyncHandler(updateMood));
router.get("/dashboard/:userId", asyncHandler(getDashboard));
router.get("/weekly/:userId", asyncHandler(getWeekly));
router.get("/history/:userId", asyncHandler(getHistory));
router.get("/insights/:userId", asyncHandler(getInsights));

module.exports = router;