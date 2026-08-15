// backend/services/ai/analysisService.js

/**
 * Analysis Service
 * Provides a hybrid rule-based and LLM (mock) analysis of journal text.
 * Returns detailed suggestions with confidence scores and evidence for each metric.
 *
 * Supports both POSITIVE and NEGATIVE keyword detection for all 7 wellbeing metrics,
 * plus negation handling (e.g. "not stressed", "don't feel anxious").
 */

// ─── Keyword mapping: each metric has positive AND negative indicators ───
const RULE_KEYWORDS = {
  // ── Stress ──
  stressHigh: [
    /\bstressed\b/i,
    /\boverwhelmed\b/i,
    /\bdeadlines?\b/i,
    /\bpressured?\b/i,
    /\bunder pressure\b/i,
    /\bburnout\b/i,
    /\bburnt?\s*out\b/i,
    /\btoo much work\b/i,
    /\bstressful\b/i,
  ],
  stressLow: [
    /\brelax(?:ed|ing)?\b/i,
    /\bno stress\b/i,
    /\bstress[\s-]*free\b/i,
    /\bpeaceful\b/i,
    /\bcalm\b/i,
    /\bat ease\b/i,
    /\bchilled?\b/i,
    /\bunwinding\b/i,
  ],

  // ── Anxiety ──
  anxietyHigh: [
    /\bworried\b/i,
    /\bnervous\b/i,
    /\banxious\b/i,
    /\bfearful\b/i,
    /\bapprehensive\b/i,
    /\bpanick?(?:ing|ed|y)?\b/i,
    /\buneasy\b/i,
    /\bon edge\b/i,
  ],
  anxietyLow: [
    /\bcalm\b/i,
    /\brelax(?:ed|ing)?\b/i,
    /\bat peace\b/i,
    /\bno anxi(?:ety|ous)\b/i,
    /\bpeaceful\b/i,
    /\bcomfortable\b/i,
    /\bserene\b/i,
  ],

  // ── Focus ──
  focusLow: [
    /\bdifficulty concentrating\b/i,
    /\bhard to focus\b/i,
    /\bcan'?t focus\b/i,
    /\btrouble concentrating\b/i,
    /\bdistracted\b/i,
    /\bfoggy\b/i,
    /\bbrain fog\b/i,
    /\bcan'?t concentrate\b/i,
  ],
  focusHigh: [
    /\bfocused\b/i,
    /\bconcentrat(?:ed|ing)\b/i,
    /\bin the zone\b/i,
    /\bsharp\b/i,
    /\bclear headed\b/i,
    /\bclear[\s-]*mind(?:ed)?\b/i,
    /\bproductive\b/i,
    /\bgood focus\b/i,
  ],

  // ── Energy ──
  energyLow: [
    /\bnot energetic\b/i,
    /\btired\b/i,
    /\bexhausted\b/i,
    /\bfatigued\b/i,
    /\blow energy\b/i,
    /\bdrained\b/i,
    /\bsluggish\b/i,
    /\blethargic\b/i,
    /\bno energy\b/i,
    /\bwiped out\b/i,
  ],
  energyHigh: [
    /\benergetic\b/i,
    /\benergy.{0,10}(?:good|great|high|amazing|fantastic)\b/i,
    /\b(?:good|great|high|amazing|fantastic).{0,10}energy\b/i,
    /\bfull of energy\b/i,
    /\bactive\b/i,
    /\bvigorous\b/i,
    /\bfeel(?:ing)?\s+alive\b/i,
    /\brefreshed\b/i,
    /\bwide awake\b/i,
    /\benergized\b/i,
  ],

  // ── Motivation ──
  motivationLow: [
    /\bno motivation\b/i,
    /\bunmotivated\b/i,
    /\black(?:ing)? motivation\b/i,
    /\bcan'?t (?:be bothered|start)\b/i,
    /\bdon'?t (?:want|feel like) (?:do|doing)\b/i,
    /\bno drive\b/i,
    /\bapathetic\b/i,
    /\bhard to start\b/i,
    /\bprocrastinat(?:ing|ed|e)\b/i,
    /\blazy\b/i,
  ],
  motivationHigh: [
    /\bmotivated\b/i,
    /\binspired\b/i,
    /\bdetermined\b/i,
    /\bdriven\b/i,
    /\bproductive\b/i,
    /\bambitious\b/i,
    /\bready to (?:go|work|start)\b/i,
    /\bfeel(?:ing)? (?:more )?motivated\b/i,
    /\bfeel(?:ing)? great about\b/i,
    /\bexcited to\b/i,
    /\beager\b/i,
  ],

  // ── Social Interaction ──
  socialHigh: [
    /\btalk(?:ed|ing)? (?:with|to) friends?\b/i,
    /\btalk(?:ed|ing)? (?:with|to) family\b/i,
    /\bfamily support\b/i,
    /\bsocial support\b/i,
    /\bfriends? support\b/i,
    /\bspent time with\b/i,
    /\bhung out\b/i,
    /\bsociali[sz](?:ed|ing)\b/i,
    /\bmet (?:up )?with\b/i,
    /\bconnected with\b/i,
    /\bgathering\b/i,
    /\bparty\b/i,
    /\bsocial\b/i,
  ],
  socialLow: [
    /\bisolat(?:ed|ion|ing)\b/i,
    /\balone\b/i,
    /\blonely\b/i,
    /\bavoided (?:people|everyone|interaction)\b/i,
    /\bno social\b/i,
    /\bwithdr(?:awn|ew)\b/i,
    /\banti[\s-]*social\b/i,
    /\bdidn'?t talk\b/i,
    /\bstayed in\b/i,
    /\bno one to talk\b/i,
  ],

  // ── Sleep ──
  sleepLow: [
    /\bpoor(?:ly)? sleep\b/i,
    /\bslept poorly\b/i,
    /\bawake at night\b/i,
    /\binsomnia\b/i,
    /\bcan'?t sleep\b/i,
    /\bcouldn'?t sleep\b/i,
    /\bsleeping only \d+-?\d* hours?\b/i,
    /\bbad sleep\b/i,
    /\btossed? and turned?\b/i,
    /\bwoke up (?:multiple|several|many) times?\b/i,
    /\bdidn'?t sleep (?:well|enough|much)\b/i,
    /\bhardly slept\b/i,
    /\brestless night\b/i,
  ],
  sleepHigh: [
    /\bsleep\s*well\b/i,
    /\bslept\s*well\b/i,
    /\bgood\s*(?:night'?s?)?\s*sleep\b/i,
    /\bgreat\s*sleep\b/i,
    /\brestful\s*sleep\b/i,
    /\bslept\s*(?:really\s+|very\s+)?good\b/i,
    /\bslept\s*(?:really\s+|very\s+)?great\b/i,
    /\b(?:well|good)\s*(?:night'?s?)?\s*rest\b/i,
    /\bslept\s*enough\b/i,
    /\bslept\s*(?:\d+|eight|nine|ten)\s*hours?\b/i,
    /\bfull\s*night'?s?\s*(?:sleep|rest)\b/i,
    /\bwoke\s*up\s*(?:feeling\s+)?(?:refreshed|rested|great|good)\b/i,
    /\brestful\b/i,
    /\b(?:deep|solid|sound)\s*sleep\b/i,
  ],
};

// ── Negation patterns — checked in the vicinity of matched keywords ──
const NEGATION_PATTERNS = [
  /\bnot\b/i,
  /\bno\b/i,
  /\bdon'?t\b/i,
  /\bdoesn'?t\b/i,
  /\bdidn'?t\b/i,
  /\bnever\b/i,
  /\bwithout\b/i,
  /\bhardly\b/i,
  /\bbarely\b/i,
  /\bnot\s+(?:really|very|that)\b/i,
  /\bdo not\b/i,
];

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
 * Checks if a keyword match is negated by looking at the surrounding context
 * (up to 5 words before the match position).
 */
function isNegated(fullText, matchedWord) {
  const lowerText = fullText.toLowerCase();
  const lowerMatch = matchedWord.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerMatch);
  if (matchIndex === -1) return false;

  // Look at up to 40 characters before the matched word for a negation
  const preceding = lowerText.substring(Math.max(0, matchIndex - 40), matchIndex);

  for (const neg of NEGATION_PATTERNS) {
    if (neg.test(preceding)) {
      return true;
    }
  }
  return false;
}

/**
 * Rule‑based detection for each metric.
 * Checks both positive and negative indicators, plus negation handling.
 * Returns an object where each key is a metric name and the value contains
 *   { value, confidence, source, evidence }.
 * Returns null for a metric if no evidence is found.
 */
function detectByRules(journalText, source = "journal") {
  const result = {};
  const baseConfidence = source === "speech" ? 0.75 : 0.9;

  const setMetric = (metric, value, evidence, confidence) => {
    result[metric] = {
      value: Math.min(10, Math.max(1, value)),
      confidence: confidence || baseConfidence,
      source: [source],
      evidence,
    };
  };

  /**
   * Detect a metric using both high (negative-wellbeing) and low (positive-wellbeing)
   * keyword lists, with negation awareness.
   *
   * @param {string} metric        - The metric key (e.g. "stressLevel")
   * @param {RegExp[]} highKeywords - Keywords indicating HIGH/bad values
   * @param {RegExp[]} lowKeywords  - Keywords indicating LOW/good values
   * @param {number} highValue      - The value to assign when high keywords match
   * @param {number} lowValue       - The value to assign when low keywords match
   * @param {number} negatedHighValue - The value when high keyword is negated (flip)
   * @param {number} negatedLowValue  - The value when low keyword is negated (flip)
   */
  const detectMetric = (metric, highKeywords, lowKeywords, highValue, lowValue, negatedHighValue, negatedLowValue) => {
    const highMatches = findMatches(journalText, highKeywords);
    const lowMatches = findMatches(journalText, lowKeywords);

    // Filter out negated matches and categorize
    const effectiveHigh = [];
    const effectiveLow = [];

    for (const m of highMatches) {
      if (isNegated(journalText, m)) {
        // "not stressed" → means LOW stress → positive
        effectiveLow.push(`not ${m}`);
      } else {
        effectiveHigh.push(m);
      }
    }

    for (const m of lowMatches) {
      if (isNegated(journalText, m)) {
        // "not relaxed" → means HIGH stress → negative
        effectiveHigh.push(`not ${m}`);
      } else {
        effectiveLow.push(m);
      }
    }

    if (effectiveHigh.length > 0 && effectiveLow.length > 0) {
      // Conflicting signals — use whichever has more evidence, reduce confidence
      if (effectiveHigh.length >= effectiveLow.length) {
        setMetric(metric, highValue, [...effectiveHigh, ...effectiveLow], baseConfidence - 0.15);
      } else {
        setMetric(metric, lowValue, [...effectiveLow, ...effectiveHigh], baseConfidence - 0.15);
      }
    } else if (effectiveHigh.length > 0) {
      setMetric(metric, highValue, effectiveHigh);
    } else if (effectiveLow.length > 0) {
      setMetric(metric, lowValue, effectiveLow);
    } else {
      result[metric] = null;
    }
  };

  // ─── Stress: high=7(bad), low=2(good, relaxed) ───
  detectMetric("stressLevel",
    RULE_KEYWORDS.stressHigh, RULE_KEYWORDS.stressLow,
    7, 2, 2, 7
  );

  // ─── Anxiety: high=7(bad), low=2(good, calm) ───
  detectMetric("anxietyLevel",
    RULE_KEYWORDS.anxietyHigh, RULE_KEYWORDS.anxietyLow,
    7, 2, 2, 7
  );

  // ─── Focus: low=4(bad), high=8(good) ───
  detectMetric("focusLevel",
    RULE_KEYWORDS.focusLow, RULE_KEYWORDS.focusHigh,
    4, 8, 8, 4
  );

  // ─── Energy: low=2(bad), high=8(good) ───
  detectMetric("energyLevel",
    RULE_KEYWORDS.energyLow, RULE_KEYWORDS.energyHigh,
    2, 8, 8, 2
  );

  // ─── Motivation: low=2(bad), high=8(good) ───
  detectMetric("motivationLevel",
    RULE_KEYWORDS.motivationLow, RULE_KEYWORDS.motivationHigh,
    2, 8, 8, 2
  );

  // ─── Social Interaction: low=2(bad), high=8(good) ───
  detectMetric("socialInteraction",
    RULE_KEYWORDS.socialLow, RULE_KEYWORDS.socialHigh,
    2, 8, 8, 2
  );

  // ─── Sleep: low=2(bad), high=8(good) ───
  detectMetric("sleepLevel",
    RULE_KEYWORDS.sleepLow, RULE_KEYWORDS.sleepHigh,
    2, 8, 8, 2
  );

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
    "motivationLevel",
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
 *
 * Uses Gemini AI when available, falls back to rule-based analysis.
 */
async function analyzeJournalEnhanced(journalText, source = "journal") {
  const { analyzeTextWithGemini, isGeminiAvailable } = require("./geminiService");
  if (!isGeminiAvailable()) {
    throw new Error("AI analysis is not configured: GEMINI_API_KEY is missing in backend .env file.");
  }

  console.log(`[AnalysisService] Using Gemini AI for ${source} analysis...`);
  return await analyzeTextWithGemini(journalText, source);
}

module.exports = {
  analyzeJournalEnhanced,
};

