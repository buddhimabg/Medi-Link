// backend/services/ai/speechAnalyzer.js

/**
 * Analyzes speech audio to extract transcript, emotional insights, and suggestions.
 * This implementation now uses the hybrid analysis service for emotion metrics.
 * @param {Object} audioFile - Placeholder, not used in mock implementation.
 * @returns {Promise<Object>}
 */

const { analyzeJournalEnhanced } = require("./analysisService");

const analyzeSpeech = async (audioFile) => {
  // Mock transcript – in a real implementation, replace with STT service.
  const speechTranscript = "I've been feeling a bit overwhelmed lately with everything going on.";

  // Use the same hybrid analysis on the transcript text, tagged as speech.
  const { suggestions, detailedSuggestions, detectedMood } = analyzeJournalEnhanced(speechTranscript, "speech");

  // Preserve existing response shape, adding detailedSuggestions and detectedMood.
  return {
    speechTranscript,
    sentimentMood: "sad",
    primaryEmotion: "overwhelmed",
    emotionalIntensity: 7,
    stressLevel: suggestions.stressLevel ?? null,
    detectedTopics: [],
    copingStrategies: [],
    aiSummary: "Automated speech analysis completed.",
    suggestions,
    detailedSuggestions,
    detectedMood,
  };
};

module.exports = {
  analyzeSpeech,
};
