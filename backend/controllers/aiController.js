// backend/controllers/aiController.js

const { analyzeJournal } = require("../services/ai/journalAnalyzer.js");
const { analyzeSpeech } = require("../services/ai/speechAnalyzer.js");
const { apiSuccess, apiFail } = require("../utils/apiResponse.js");
const { isMeaningfulText } = require("../utils/validator.js");

// POST /api/ai/analyze-journal
const processJournal = async (req, res) => {
  try {
    const { journalText } = req.body || {};
    if (!journalText || typeof journalText !== "string" || !isMeaningfulText(journalText)) {
      return res.status(400).json(apiFail("Please enter a meaningful journal note before analyzing."));
    }

    const result = await analyzeJournal(journalText);
    // Merge AI suggestions into a mood-like object for frontend consumption
    const mood = {
      sleepLevel: result.suggestions?.sleepLevel,
      anxietyLevel: result.suggestions?.anxietyLevel,
      energyLevel: result.suggestions?.energyLevel,
      stressLevel: result.suggestions?.stressLevel,
      focusLevel: result.suggestions?.focusLevel,
      motivationLevel: result.suggestions?.motivationLevel,
      socialInteraction: result.suggestions?.socialInteraction,
    };
    // Return both AI result and derived mood data
    res.json(apiSuccess({ ...result, mood }, "Journal analyzed successfully"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to analyze journal", error.message));
  }
};

// POST /api/ai/analyze-speech
// Accepts audio file via multer (req.file) or text transcript in body
const processSpeech = async (req, res) => {
  try {
    let result;

    if (req.file && req.file.buffer) {
      // Audio file uploaded — send to Gemini for transcription + analysis
      console.log(`[AIController] Received audio file: ${req.file.mimetype}, size: ${req.file.size} bytes`);
      result = await analyzeSpeech(req.file.buffer, req.file.mimetype || "audio/webm");
    } else {
      // Check for text transcript in body
      const body = req.body || {};
      const speechText = body.speechText || body.transcript || body.text || (typeof body === "string" ? body : null);

      if (!speechText || (typeof speechText === "string" && !speechText.trim())) {
        return res.status(400).json(apiFail("Speech analysis input is required. Please provide an audio file or text transcript."));
      }

      // Analyze text transcript
      result = await analyzeSpeech(speechText, "text/plain");
    }

    res.json(apiSuccess(result, "Speech analyzed successfully"));
  } catch (error) {
    console.error("[AIController] Speech analysis error:", error);
    res.status(500).json(apiFail("Failed to analyze speech", error.message));
  }
};

// POST /api/ai/analyze-camera
const processCamera = async (req, res) => {
  try {
    // Placeholder logic for camera
    const result = {
      cameraDetectedMood: "okay",
      cameraConfidence: 85
    };
    res.json(apiSuccess(result, "Camera image analyzed successfully"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to analyze camera image", error.message));
  }
};

const { aggregateEmotions } = require("../services/ai/emotionalAggregator.js");

// POST /api/ai/analyze-combined
const processCombinedAnalysis = async (req, res) => {
  try {
    const { journalText, speechText, cameraData } = req.body || {};

    const hasJournal = journalText && typeof journalText === "string" && journalText.trim().length > 0;
    const hasSpeech = speechText && typeof speechText === "string" && speechText.trim().length > 0;
    const hasCamera = cameraData && typeof cameraData === "object" && Object.keys(cameraData).length > 0;

    const isJournalMeaningful = hasJournal && isMeaningfulText(journalText);

    if (hasJournal && !isJournalMeaningful) {
      if (!hasSpeech && !hasCamera) {
        return res.status(400).json(apiFail("Please enter a meaningful journal note before analyzing."));
      }
    }

    if (!isJournalMeaningful && !hasSpeech && !hasCamera) {
      return res.status(400).json(apiFail("At least one input (journalText, speechText, or cameraData) is required for combined analysis"));
    }

    let journalResult = null;
    let speechResult = null;
    let cameraResult = null;

    if (isJournalMeaningful) {
      journalResult = await analyzeJournal(journalText);
    }
    
    if (hasSpeech) {
      // Analyze speech text transcript
      speechResult = await analyzeSpeech(speechText, "text/plain");
    }

    if (hasCamera) {
      // Mock camera data processing
      cameraResult = {
        detectedMood: {
          mood: cameraData.mood || "okay",
          confidence: cameraData.confidence || 0.72,
          source: ["camera"]
        }
      };
    }

    const aggregated = aggregateEmotions(journalResult, speechResult, cameraResult);

    res.json(apiSuccess(aggregated, "Combined analysis completed successfully"));
  } catch (error) {
    res.status(500).json(apiFail("Failed to process combined analysis", error.message));
  }
};

module.exports = {
  processJournal,
  processSpeech,
  processCamera,
  processCombinedAnalysis
};
