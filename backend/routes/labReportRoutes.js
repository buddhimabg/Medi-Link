const express = require("express");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");
const upload = require("../middlewares/uploadMiddleware.js");
const {
  uploadAndAnalyzeReport,
  getReportHistory,
  getReportById,
} = require("../controllers/labReportController.js");

const router = express.Router();

router.post("/upload", upload.single("report"), asyncHandler(uploadAndAnalyzeReport));
router.get("/user/:userId", asyncHandler(getReportHistory));
router.get("/:reportId", asyncHandler(getReportById));

module.exports = router;
