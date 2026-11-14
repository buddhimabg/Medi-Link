const express = require("express");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");
const {
  createAssessment,
  getLatestAssessment,
  getAssessmentHistory
} = require("../controllers/assessmentController.js");

const router = express.Router();

router.post("/", asyncHandler(createAssessment));
router.get("/latest/:userId", asyncHandler(getLatestAssessment));
router.get("/history/:userId", asyncHandler(getAssessmentHistory));

module.exports = router;
