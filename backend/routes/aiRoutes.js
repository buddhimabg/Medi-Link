// backend/routes/aiRoutes.js

const express = require("express");
const multer = require("multer");
const {
  processJournal,
  processSpeech,
  processCamera,
  processCombinedAnalysis
} = require("../controllers/aiController.js");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");

const router = express.Router();

// Configure multer for audio uploads (memory storage — keeps file in buffer)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    // Accept common audio MIME types
    const allowedTypes = [
      "audio/webm", "audio/ogg", "audio/wav", "audio/mp3",
      "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/flac",
      "video/webm", // MediaRecorder sometimes reports this
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}. Accepted: webm, ogg, wav, mp3, mp4, m4a, flac.`));
    }
  },
});

router.post("/analyze-journal", asyncHandler(processJournal));
router.post("/analyze-speech", audioUpload.single("audio"), asyncHandler(processSpeech));
router.post("/analyze-camera", asyncHandler(processCamera));
router.post("/analyze-combined", asyncHandler(processCombinedAnalysis));

module.exports = router;
