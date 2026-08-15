// backend/services/ai/emotionalAggregator.js

/**
 * Aggregates multi-source AI insights with strict priority and confidence merging rules.
 * Sources: journal, speech, camera
 * Priority: journal > speech > camera
 */

/**
 * Merges metric values across multiple AI sources (Journal, Speech).
 * Priority: Journal over Speech. Agreement boosts confidence; conflict reduces confidence.
 */
function mergeMetric(journalVal, speechVal) {
  if (!journalVal && !speechVal) return null;

  // If only one exists, return it directly
  if (journalVal && !speechVal) return { ...journalVal };
  if (!journalVal && speechVal) return { ...speechVal };

  // Both exist. Check for conflict vs agreement.
  // We consider an agreement if they are on the same half of the scale or very close.
  // For simplicity, we just check absolute difference.
  const diff = Math.abs(journalVal.value - speechVal.value);
  
  const merged = {
    value: journalVal.value, // Priority: Journal
    source: ["journal", "speech"],
    evidence: [...new Set([...(journalVal.evidence || []), ...(speechVal.evidence || [])])],
  };

  if (diff <= 2) {
    // Agreement: boost confidence
    merged.confidence = Math.min(1.0, Math.max(journalVal.confidence, speechVal.confidence) + 0.1);
  } else {
    // Conflict: reduce confidence of highest priority
    merged.confidence = Math.max(0, journalVal.confidence - 0.2);
  }

  // If after conflict confidence is too low, we return null to avoid guessing
  if (merged.confidence < 0.4) {
    return null;
  }

  return merged;
}

function mergeDetectedMood(journalMood, speechMood, cameraMood) {
  const moods = [];
  if (journalMood) moods.push(journalMood);
  if (speechMood) moods.push(speechMood);
  if (cameraMood) moods.push(cameraMood);

  if (moods.length === 0) return null;

  // Sort by priority implicitly: journal is added first, then speech, then camera.
  // In a real system, we might look for agreement. For now, take the highest priority
  // and append sources.
  const primary = moods[0];
  return {
    mood: primary.mood,
    confidence: primary.confidence,
    source: moods.map(m => m.source[0])
  };
}

const aggregateEmotions = (journalData, speechData, cameraData) => {
  const metrics = [
    "sleepLevel", "anxietyLevel", "energyLevel", 
    "motivationLevel", "focusLevel", "stressLevel", "socialInteraction"
  ];

  const aiSuggestions = {};
  
  for (const metric of metrics) {
    const journalMetric = journalData?.detailedSuggestions?.[metric];
    const speechMetric = speechData?.detailedSuggestions?.[metric];
    
    aiSuggestions[metric] = mergeMetric(journalMetric, speechMetric);
  }

  const detectedMood = mergeDetectedMood(
    journalData?.detectedMood,
    speechData?.detectedMood,
    cameraData?.detectedMood
  );

  // Extract simple insights based on the aggregated data
  let keyEmotion = null;
  let stressLevelText = "low";
  
  if (aiSuggestions.anxietyLevel && aiSuggestions.anxietyLevel.value >= 7) {
    keyEmotion = "anxiety";
  } else if (aiSuggestions.stressLevel && aiSuggestions.stressLevel.value >= 7) {
    keyEmotion = "stress";
  }

  if (aiSuggestions.stressLevel) {
    if (aiSuggestions.stressLevel.value >= 7) stressLevelText = "high";
    else if (aiSuggestions.stressLevel.value >= 4) stressLevelText = "medium";
  }

  return {
    aiSuggestions,
    detectedMood,
    uiState: {
      showSuggestions: true,
      showDetectedMood: !!detectedMood,
      allowAcceptAll: true,
      allowModify: true,
      allowSkip: true,
      allowCancel: true
    },
    extractedInsights: {
      keyEmotion,
      stressLevelText,
      summary: "AI has analyzed your inputs and provided supportive suggestions."
    }
  };
};

module.exports = {
  aggregateEmotions
};
