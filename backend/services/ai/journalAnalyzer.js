// backend/services/ai/journalAnalyzer.js

/**
 * Analyzes journal text to extract emotional insights and suggestions.
 * This file now delegates to the hybrid analysis service.
 * @param {string} journalText
 * @returns {Promise<Object>}
 */

const { analyzeJournalEnhanced } = require("./analysisService");

/**
 * Backward‑compatible wrapper around the enhanced analysis service.
 * Returns the original shape expected by the frontend plus a `detailedSuggestions`
 * field that contains confidence scores and evidence for each metric.
 */
const analyzeJournal = async (journalText) => {
  const { suggestions, detailedSuggestions, detectedMood } = await analyzeJournalEnhanced(journalText, "journal");

  // Preserve original fields (placeholders for now).
  const result = {
    sentimentMood: "neutral",
    primaryEmotion: "neutral",
    emotionalIntensity: 5,
    stressLevel: suggestions.stressLevel ?? null,
    detectedTopics: [],
    copingStrategies: [],
    aiSummary: "Automated analysis completed.",
    suggestions,
    detailedSuggestions,
    detectedMood,
  };
  return result;
};

module.exports = {
  analyzeJournal,
};
