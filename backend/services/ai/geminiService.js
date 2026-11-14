// backend/services/ai/geminiService.js

/**
 * Gemini AI Service
 * Provides text analysis and audio transcription using Google Gemini API.
 * API key is read from process.env.GEMINI_API_KEY (never exposed to frontend).
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
let model = null;

/**
 * Lazily initializes the Gemini client. Returns null if no API key is set.
 */
function getModel(modelName = "gemini-3.1-flash-lite") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("[GeminiService] GEMINI_API_KEY not set — AI features will fall back to rule-based analysis.");
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI.getGenerativeModel({ model: modelName });
}

// ─── Valid answer options per metric (must match frontend) ───
const VALID_OPTIONS = {
  sleepLevel: [2, 5, 8, 10],
  anxietyLevel: [2, 4, 7, 10],
  energyLevel: [2, 5, 8, 10],
  motivationLevel: [2, 5, 8, 10],
  focusLevel: [2, 5, 8, 10],
  stressLevel: [2, 4, 7, 10],
  socialInteraction: [2, 5, 8, 10],
};

const METRIC_DESCRIPTIONS = {
  sleepLevel: "Sleep quality (2=very poor, 5=okay, 8=well, 10=very restful)",
  anxietyLevel: "Anxiety level (2=very calm, 4=mild, 7=moderate, 10=severe)",
  energyLevel: "Energy level (2=exhausted, 5=low/sluggish, 8=moderate/fine, 10=high/active)",
  motivationLevel: "Motivation level (2=no motivation, 5=low, 8=moderate, 10=highly motivated)",
  focusLevel: "Focus level (2=very foggy, 5=easily distracted, 8=moderate, 10=sharp/in zone)",
  stressLevel: "Stress level (2=very low, 4=manageable, 7=high/overwhelmed, 10=extreme/burnout)",
  socialInteraction: "Social interaction (2=complete isolation, 5=minimal, 8=moderate, 10=very social)",
};

/**
 * Build the analysis prompt for Gemini.
 */
function buildAnalysisPrompt(text) {
  const metricsDesc = Object.entries(METRIC_DESCRIPTIONS)
    .map(([key, desc]) => `  - "${key}": ${desc}. Valid values: [${VALID_OPTIONS[key].join(", ")}]`)
    .join("\n");

  return `You are a mental health wellbeing analysis assistant. Analyze the following journal/speech text and extract emotional and wellbeing insights.

TEXT TO ANALYZE:
"${text}"

INSTRUCTIONS:
1. Detect the overall mood. Choose exactly one of: "great", "good", "okay", "sad", "terrible".
2. For each of the following 7 wellbeing metrics, determine a value ONLY if there is clear evidence in the text. If there is no evidence for a metric, set its value to null.
3. Each metric value MUST be one of its valid options listed below. Pick the closest valid value.
4. Provide a confidence score (0.0 to 1.0) for each detected metric.
5. Provide a brief evidence quote from the text for each detected metric.
6. Handle negation properly: "I do not feel stress" means LOW stress (value=2), "not motivated" means LOW motivation (value=2).

METRICS:
${metricsDesc}

RESPOND WITH ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "detectedMood": {
    "mood": "good",
    "confidence": 0.85
  },
  "metrics": {
    "sleepLevel": { "value": 8, "confidence": 0.9, "evidence": "slept well last night" },
    "anxietyLevel": null,
    "energyLevel": { "value": 8, "confidence": 0.85, "evidence": "energy level good" },
    "motivationLevel": null,
    "focusLevel": null,
    "stressLevel": null,
    "socialInteraction": null
  }
}

Set a metric to null if the text provides no clear indication for it. Do NOT guess.`;
}

/**
 * Parse Gemini's JSON response, with robust error handling.
 */
function parseGeminiResponse(responseText, source = "journal") {
  try {
    // Strip markdown code fences if present
    let cleaned = responseText.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    const parsed = JSON.parse(cleaned);

    // Build detailedSuggestions in the format the aggregator expects
    const detailedSuggestions = {};
    const suggestions = {};

    for (const [key, opts] of Object.entries(VALID_OPTIONS)) {
      const metricData = parsed.metrics?.[key];
      if (metricData && metricData.value !== null && metricData.value !== undefined) {
        // Snap to closest valid option
        const snapped = snapToClosest(key, metricData.value);
        detailedSuggestions[key] = {
          value: snapped,
          confidence: Math.min(1, Math.max(0, metricData.confidence || 0.8)),
          source: [source],
          evidence: metricData.evidence ? [metricData.evidence] : [],
        };
        suggestions[key] = snapped;
      } else {
        detailedSuggestions[key] = null;
        suggestions[key] = null;
      }
    }

    const detectedMood = parsed.detectedMood
      ? {
          mood: parsed.detectedMood.mood || "okay",
          confidence: parsed.detectedMood.confidence || 0.8,
          source: [source],
        }
      : { mood: "okay", confidence: 0.5, source: [source] };

    return { suggestions, detailedSuggestions, detectedMood };
  } catch (err) {
    console.error("[GeminiService] Failed to parse Gemini response:", err.message);
    console.error("[GeminiService] Raw response:", responseText?.substring(0, 500));
    return null;
  }
}

/**
 * Snap a value to the closest valid option for a metric.
 */
function snapToClosest(metricKey, value) {
  const opts = VALID_OPTIONS[metricKey];
  if (!opts || typeof value !== "number") return value;
  let closest = opts[0];
  let minDiff = Math.abs(value - closest);
  for (const opt of opts) {
    const diff = Math.abs(value - opt);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }
  return closest;
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Helper: Generate content with automatic retries on 503/429 and fallback to alternate Gemini models.
 */
async function generateWithRetryAndFallback(content) {
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    const m = getModel(modelName);
    if (!m) {
      throw new Error("AI service is not configured: GEMINI_API_KEY is missing in backend .env file.");
    }

    // Try up to 2 times per model
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await m.generateContent(content);
        if (attempt > 1 || modelName !== modelsToTry[0]) {
          console.log(`[GeminiService] Successfully generated content using model: ${modelName} (attempt ${attempt})`);
        }
        return result;
      } catch (err) {
        lastError = err;
        const isTransient = err.message.includes("503") || err.message.includes("429") || err.message.includes("High demand") || err.message.includes("Service Unavailable") || err.message.includes("overloaded");
        
        if (isTransient) {
          console.warn(`[GeminiService] Model ${modelName} encountered busy/transient status (${err.message.split('\n')[0]}). Attempt ${attempt}/2...`);
          if (attempt < 2) {
            // Wait 1.5 seconds before retry
            await new Promise(r => setTimeout(r, 1500));
          } else {
            console.warn(`[GeminiService] Model ${modelName} busy after 2 attempts. Switching to next fallback model...`);
          }
        } else {
          // If non-transient error, log and break to next model
          console.error(`[GeminiService] Error with model ${modelName}:`, err.message);
          break;
        }
      }
    }
  }

  const errorMsg = lastError?.message || "All Gemini models are busy or unavailable.";
  if (errorMsg.includes("503") || errorMsg.includes("High demand") || errorMsg.includes("Service Unavailable") || errorMsg.includes("overloaded")) {
    throw new Error("AI models are temporarily experiencing high traffic (503). Please try again in a moment.");
  }
  if (errorMsg.includes("429") || errorMsg.includes("quota")) {
    throw new Error("AI API quota exceeded. Please check your API key status or try again later.");
  }
  throw new Error("AI generation failed: " + errorMsg.split('\n')[0]);
}

/**
 * Analyze text (journal or speech transcript) with Gemini.
 * Returns { suggestions, detailedSuggestions, detectedMood } or throws on failure.
 */
async function analyzeTextWithGemini(text, source = "journal") {
  if (!getModel()) {
    throw new Error("AI service is not configured: GEMINI_API_KEY is missing in backend .env file.");
  }

  const prompt = buildAnalysisPrompt(text);
  const result = await generateWithRetryAndFallback(prompt);
  const response = result.response;
  const responseText = response.text();
  const parsed = parseGeminiResponse(responseText, source);
  if (!parsed) {
    throw new Error("Failed to parse AI response format.");
  }
  return parsed;
}

/**
 * Transcribe audio using Gemini's multimodal capabilities.
 * Accepts a Buffer of audio data and its MIME type (e.g. "audio/webm").
 * Returns { transcript, analysis } where analysis is the same shape as analyzeTextWithGemini or throws on failure.
 */
async function transcribeAndAnalyzeAudio(audioBuffer, mimeType = "audio/webm") {
  if (!getModel()) {
    throw new Error("AI service is not configured: GEMINI_API_KEY is missing in backend .env file.");
  }

  const base64Audio = audioBuffer.toString("base64");

  const metricsDesc = Object.entries(METRIC_DESCRIPTIONS)
    .map(([key, desc]) => `  - "${key}": ${desc}. Valid values: [${VALID_OPTIONS[key].join(", ")}]`)
    .join("\n");

  const prompt = `You are a mental health wellbeing assistant. You will receive an audio recording of a person speaking.

TASK:
1. Transcribe the speech to text accurately.
2. Analyze the transcript for emotional and wellbeing insights.
3. Detect the overall mood: choose one of "great", "good", "okay", "sad", "terrible".
4. For each metric below, determine a value ONLY if there is evidence. Set to null if no evidence.
5. Handle negation: "not stressed" = low stress, "can't sleep" = poor sleep.

METRICS:
${metricsDesc}

RESPOND WITH ONLY valid JSON (no markdown, no code fences):
{
  "transcript": "the transcribed text here",
  "detectedMood": {
    "mood": "okay",
    "confidence": 0.8
  },
  "metrics": {
    "sleepLevel": null,
    "anxietyLevel": null,
    "energyLevel": null,
    "motivationLevel": null,
    "focusLevel": null,
    "stressLevel": null,
    "socialInteraction": null
  }
}`;

  const result = await generateWithRetryAndFallback([
    prompt,
    {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    },
  ]);

  const responseText = result.response.text();
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }

  const parsed = JSON.parse(cleaned);
  const transcript = parsed.transcript || "";

  const detailedSuggestions = {};
  const suggestions = {};

  for (const [key] of Object.entries(VALID_OPTIONS)) {
    const metricData = parsed.metrics?.[key];
    if (metricData && metricData.value !== null && metricData.value !== undefined) {
      const snapped = snapToClosest(key, metricData.value);
      detailedSuggestions[key] = {
        value: snapped,
        confidence: Math.min(1, Math.max(0, metricData.confidence || 0.75)),
        source: ["speech"],
        evidence: metricData.evidence ? [metricData.evidence] : [transcript.substring(0, 100)],
      };
      suggestions[key] = snapped;
    } else {
      detailedSuggestions[key] = null;
      suggestions[key] = null;
    }
  }

  const detectedMood = parsed.detectedMood && parsed.detectedMood.mood
    ? {
        mood: parsed.detectedMood.mood || "okay",
        confidence: parsed.detectedMood.confidence || 0.7,
        source: ["speech"],
      }
    : { mood: "okay", confidence: 0.5, source: ["speech"] };

  return {
    transcript,
    analysis: { suggestions, detailedSuggestions, detectedMood },
  };
}

/**
 * Check if Gemini is available (API key is set).
 */
function isGeminiAvailable() {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!(apiKey && apiKey !== "your_gemini_api_key_here");
}

module.exports = {
  analyzeTextWithGemini,
  transcribeAndAnalyzeAudio,
  isGeminiAvailable,
};
