// backend/services/ai/analysisService.js

/**
 * Analysis Service
 * Provides a hybrid rule-based and LLM (mock) analysis of journal text.
 * Returns detailed suggestions with confidence scores and evidence for each metric.
 */

// Keywords mapping for rule detection
const RULE_KEYWORDS = {
  stress: [
    /stressed/i,
    /overwhelmed/i,
    /deadlines?/i,
    /pressure/i,
    /pressured/i,
  ],
  anxiety: [
    /worried/i,
    /nervous/i,
    /anxious/i,
    /fearful/i,
    /apprehensive/i,
  ],
  focusDecrease: [/difficulty concentrating/i, /hard to focus/i, /can't focus/i, /trouble concentrating/i],
  energyDecrease: [
    /not energetic/i,
    /tired/i,
    /exhausted/i,
    /fatigued/i,
    /low energy/i,
  ],
  socialIncrease: [
    /talk with friends/i,
    /talk with family/i,
    /family support/i,
    /social support/i,
    /friends? support/i,
  ],
  sleepDecrease: [
    /poor sleep/i,
    /awake at night/i,
    /insomnia/i,
    /can't sleep/i,
    /sleeping only \d+-?\d* hours/i,
  ],
};

/**
 * Helper to test a list of regexes against text and collect matches.
 */
function findMatches(text, regexList) {
  const matches = [];
  for (const regex of regexList) {
    const match = text.match(regex);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Rule‑based detection for each metric.
 * Returns an object where each key is a metric name and the value contains
 *   { value, confidence, source, evidence }.
 * Returns null for a metric if no evidence is found.
 */
function detectByRules(journalText, source = "journal") {
  const result = {};

  const baseConfidence = source === "speech" ? 0.75 : 0.9;

  // Helper to set result
  const setMetric = (metric, value, evidence) => {
    result[metric] = { 
      value: Math.min(10, Math.max(1, value)), 
      confidence: baseConfidence, 
      source: [source], 
      evidence 
    };
  };

  // Stress detection
  const stressMatches = findMatches(journalText, RULE_KEYWORDS.stress);
  if (stressMatches.length) {
    setMetric("stressLevel", 7, stressMatches);
  } else {
    result["stressLevel"] = null;
  }

  // Anxiety detection
  const anxietyMatches = findMatches(journalText, RULE_KEYWORDS.anxiety);
  if (anxietyMatches.length) {
    setMetric("anxietyLevel", 8, anxietyMatches);
  } else {
    result["anxietyLevel"] = null;
  }

  // Focus detection (decrease)
  const focusMatches = findMatches(journalText, RULE_KEYWORDS.focusDecrease);
  if (focusMatches.length) {
    setMetric("focusLevel", 4, focusMatches);
  } else {
    result["focusLevel"] = null;
  }

  // Energy detection (decrease)
  const energyMatches = findMatches(journalText, RULE_KEYWORDS.energyDecrease);
  if (energyMatches.length) {
    setMetric("energyLevel", 4, energyMatches);
  } else {
    result["energyLevel"] = null;
  }

  // Social interaction increase
  const socialMatches = findMatches(journalText, RULE_KEYWORDS.socialIncrease);
  if (socialMatches.length) {
    setMetric("socialInteraction", 7, socialMatches);
  } else {
    result["socialInteraction"] = null;
  }

  // Sleep detection (decrease)
  const sleepMatches = findMatches(journalText, RULE_KEYWORDS.sleepDecrease);
  if (sleepMatches.length) {
    setMetric("sleepLevel", 4, sleepMatches);
  } else {
    result["sleepLevel"] = null;
  }

  return result;
}

/**
 * Mock LLM analysis – in a real system this would call an LLM/NLP service.
 * For now it returns null values by default to prevent guessing without strong evidence.
 */
function mockLLMAnalysis(journalText, source = "journal") {
  const metrics = [
    "stressLevel",
    "anxietyLevel",
    "focusLevel",
    "energyLevel",
    "socialInteraction",
    "sleepLevel",
  ];
  const result = {};
  for (const metric of metrics) {
    // In mock, return null to avoid guessing.
    result[metric] = null;
  }
  
  // Basic mock keyword logic for demonstration
  if (journalText.toLowerCase().includes("feeling sad") || journalText.toLowerCase().includes("terrible")) {
     result["energyLevel"] = { value: 3, confidence: source === "speech" ? 0.6 : 0.8, source: [source], evidence: ["feeling sad"] };
     result["motivationLevel"] = { value: 3, confidence: source === "speech" ? 0.6 : 0.8, source: [source], evidence: ["feeling sad"] };
  }

  return result;
}

/**
 * Combine rule‑based and LLM results for a single source.
 * Preference is given to rule‑based evidence when present.
 */
function combineResults(ruleResult, llmResult) {
  const combined = {};
  const metrics = [
    "stressLevel", "anxietyLevel", "focusLevel", 
    "energyLevel", "socialInteraction", "sleepLevel", "motivationLevel"
  ];
  
  for (const metric of metrics) {
    const rule = ruleResult[metric];
    const llm = llmResult[metric];
    
    if (rule && llm) {
       combined[metric] = {
         value: rule.value,
         confidence: Math.min(1, rule.confidence + 0.1),
         source: rule.source,
         evidence: [...new Set([...rule.evidence, ...llm.evidence])]
       };
    } else if (rule) {
       combined[metric] = rule;
    } else if (llm) {
       combined[metric] = llm;
    } else {
       combined[metric] = null;
    }
  }
  return combined;
}

/**
 * Main export – performs full analysis and returns both a simple suggestions map
 * (compatible with existing API) and a detailed structure.
 * Supports source tagging ("journal" or "speech").
 */
function analyzeJournalEnhanced(journalText, source = "journal") {
  const ruleResult = detectByRules(journalText, source);
  const llmResult = mockLLMAnalysis(journalText, source);
  const detailed = combineResults(ruleResult, llmResult);

  // Build the simple suggestions object for backward compatibility.
  const suggestions = {};
  for (const [key, val] of Object.entries(detailed)) {
    if (val) {
      suggestions[key] = val.value;
    } else {
      suggestions[key] = null;
    }
  }

  // Detect simple mood based on text
  let detectedMood = "okay";
  const lowerText = journalText.toLowerCase();
  if (lowerText.includes("sad") || lowerText.includes("terrible")) detectedMood = "sad";
  if (lowerText.includes("great") || lowerText.includes("awesome")) detectedMood = "great";
  if (lowerText.includes("good") || lowerText.includes("nice")) detectedMood = "good";

  return {
    suggestions,
    detailedSuggestions: detailed,
    detectedMood: {
      mood: detectedMood,
      confidence: source === "speech" ? 0.7 : 0.85,
      source: [source]
    }
  };
}

module.exports = {
  analyzeJournalEnhanced,
};
