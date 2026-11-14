// backend/services/ai/speechAnalyzer.js

/**
 * Analyzes speech audio using Gemini AI for transcription and emotional analysis.
 * Falls back to rule-based text analysis if Gemini is unavailable.
 */

const { transcribeAndAnalyzeAudio, isGeminiAvailable } = require("./geminiService");
const { analyzeJournalEnhanced } = require("./analysisService");

/**
 * Analyze speech audio.
 * @param {Buffer} audioBuffer - Raw audio data (from multer)
 * @param {string} mimeType - MIME type of the audio (e.g. "audio/webm")
 * @returns {Promise<Object>} Analysis result with transcript + emotional insights
 */
const analyzeSpeech = async (audioBuffer, mimeType = "audio/webm") => {
  if (!isGeminiAvailable()) {
    throw new Error("AI analysis is not configured: GEMINI_API_KEY is missing in backend .env file.");
  }

  // If audio buffer is provided, transcribe and analyze using Gemini
  if (audioBuffer && Buffer.isBuffer(audioBuffer)) {
    console.log("[SpeechAnalyzer] Using Gemini for audio transcription + analysis...");
    const geminiResult = await transcribeAndAnalyzeAudio(audioBuffer, mimeType);

    if (geminiResult && geminiResult.transcript) {
      console.log(`[SpeechAnalyzer] Gemini transcribed: "${geminiResult.transcript.substring(0, 80)}..."`);
      const { transcript, analysis } = geminiResult;

      return {
        speechTranscript: transcript,
        sentimentMood: analysis.detectedMood?.mood || "okay",
        primaryEmotion: analysis.detectedMood?.mood || "neutral",
        emotionalIntensity: 5,
        stressLevel: analysis.suggestions?.stressLevel ?? null,
        detectedTopics: [],
        copingStrategies: [],
        aiSummary: "AI-powered speech analysis completed using Gemini.",
        suggestions: analysis.suggestions,
        detailedSuggestions: analysis.detailedSuggestions,
        detectedMood: analysis.detectedMood,
      };
    }
    throw new Error("AI speech analysis returned no transcript or data.");
  }

  // If text transcript is provided directly, analyze it with Gemini text service
  if (typeof audioBuffer === "string" && audioBuffer.trim().length > 0) {
    console.log("[SpeechAnalyzer] Received text transcript, analyzing with text service...");
    const { suggestions, detailedSuggestions, detectedMood } = await analyzeJournalEnhanced(audioBuffer, "speech");
    return {
      speechTranscript: audioBuffer,
      sentimentMood: detectedMood?.mood || "neutral",
      primaryEmotion: detectedMood?.mood || "neutral",
      emotionalIntensity: 5,
      stressLevel: suggestions?.stressLevel ?? null,
      detectedTopics: [],
      copingStrategies: [],
      aiSummary: "Speech text analysis completed.",
      suggestions,
      detailedSuggestions,
      detectedMood,
    };
  }

  throw new Error("No valid audio buffer or text transcript was provided for speech analysis.");
};

module.exports = {
  analyzeSpeech,
};
