// backend/routes/aiRoutes.js

const express = require("express");
const {
  processJournal,
  processSpeech,
  processCamera,
  processCombinedAnalysis
} = require("../controllers/aiController.js");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");

const router = express.Router();

router.post("/analyze-journal", asyncHandler(processJournal));
router.post("/analyze-speech", asyncHandler(processSpeech));
router.post("/analyze-camera", asyncHandler(processCamera));
router.post("/analyze-combined", asyncHandler(processCombinedAnalysis));

module.exports = router;
