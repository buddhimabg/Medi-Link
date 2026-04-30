const Biomarker = require("../models/biomarker.js");

/**
 * Debug switch for development logging
 * Set true only when debugging parsing issues
 */
const DEBUG_MODE = false;

/**
 * Conditional logger (prevents console noise in production)
 */
const log = (message, data = "") => {
  if (DEBUG_MODE) {
    console.log(`[LAB-REPORT] ${message}`, data);
  }
};

/**
 * Normalizes raw report text for consistent parsing
 * - fixes line breaks
 * - standardizes quotes
 * - converts to lowercase
 */
const normalizeText = (text) => {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/['']/g, "'")
    .replace(/["""''"]/g, '"')
    .toLowerCase();
};

/**
 * Converts biomarker keys into comparable format
 * Used for matching aliases reliably
 */
const normalizeBiomarkerKey = (value = "") => {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};

/**
 * Cleans biomarker labels extracted from report text
 */
const cleanBiomarkerLabel = (value = "") => {
  return String(value || "")
    .replace(/[_*]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[:\-\s]+|[:\-\s]+$/g, "")
    .trim();
};

/**
 * Filters out noise words to detect real biomarker labels
 */
const isLikelyBiomarkerLabel = (label = "") => {
  const normalized = normalizeBiomarkerKey(label);

  if (!normalized || normalized.length < 2) return false;
  if (!/[a-z]/i.test(normalized)) return false;

  const ignoredTerms = [
    "reference", "range", "result", "results",
    "unit", "units", "patient", "report",
    "sample", "date", "age", "gender",
    "method", "flag", "name", "value", "status",
  ];

  return !ignoredTerms.some((term) => normalized.includes(term));
};

/**
 * Escapes regex special characters safely
 */
const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Detects biomarkers mentioned in report text (name-level detection)
 * Uses DB aliases + regex line scanning
 */
const detectReportBiomarkers = (text, biomarkers) => {
  const normalizedText = normalizeText(text);
  const rawText = String(text || "").replace(/\r/g, "\n");

  const unique = new Map();
  const aliasMap = new Map();

  /**
   * Registers a valid biomarker candidate
   */
  const registerCandidate = (candidate, fallbackName = "") => {
    const cleaned = cleanBiomarkerLabel(candidate);

    if (!isLikelyBiomarkerLabel(cleaned)) return;

    const displayName = fallbackName || cleaned;
    const key = normalizeBiomarkerKey(displayName);

    if (key && !unique.has(key)) {
      unique.set(key, displayName);
    }
  };

  /**
   * Build alias lookup + detect presence in text
   */
  biomarkers.forEach((biomarker) => {
    const aliases = [biomarker.name, ...(biomarker.aliases || [])].filter(Boolean);

    aliases.forEach((alias) => {
      const key = normalizeBiomarkerKey(alias);

      if (key) {
        aliasMap.set(key, biomarker.name);
      }

      const pattern = new RegExp(
        `\\b${escapeRegex(alias.toLowerCase()).replace(/\s+/g, "\\s+")}\\b`,
        "i"
      );

      if (pattern.test(normalizedText)) {
        registerCandidate(alias, biomarker.name);
      }
    });
  });

  /**
   * Line-based extraction patterns (handles tabular reports)
   */
  const linePatterns = [
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s*[:=-]\s*(\d+(?:\.\d+)?)/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s{2,}(\d+(?:\.\d+)?)/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\s]{1,60}?)\s+(\d+(?:\.\d+)?)/,
  ];

  rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      for (const pattern of linePatterns) {
        const match = line.match(pattern);
        if (!match?.[1]) continue;

        const candidate = cleanBiomarkerLabel(match[1]);
        const key = normalizeBiomarkerKey(candidate);

        const mapped = aliasMap.get(key);

        registerCandidate(candidate, mapped || "");
        break;
      }
    });

  return Array.from(unique.values());
};

/**
 * Extracts every biomarker-like test name mentioned in the report text.
 * This keeps report counts based on the source document, not only on DB coverage.
 */
const extractReportBiomarkerNames = (text) => {
  const rawText = String(text || "").replace(/\r/g, "\n");
  const unique = new Map();

  const registerCandidate = (candidate) => {
    const cleaned = cleanBiomarkerLabel(candidate);

    if (!isLikelyBiomarkerLabel(cleaned)) return;

    const key = normalizeBiomarkerKey(cleaned);
    if (key && !unique.has(key)) {
      unique.set(key, cleaned);
    }
  };

  const linePatterns = [
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\x00-\x7F\s]{1,80}?)\s*[:=-]\s*(\d+(?:\.\d+)?)/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\x00-\x7F\s]{1,80}?)\s{2,}(\d+(?:\.\d+)?)/,
    /^\s*([A-Za-z][A-Za-z0-9()/%+\-.\x00-\x7F\s]{1,80}?)\s+(\d+(?:\.\d+)?)/,
  ];

  rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      for (const pattern of linePatterns) {
        const match = line.match(pattern);
        if (!match?.[1]) continue;

        registerCandidate(match[1]);
        break;
      }
    });

  return Array.from(unique.values());
};

/**
 * Extracts a numeric value from a report line even when the biomarker is
 * not configured in the database.
 */
const extractGenericBiomarkerValue = (text, label) => {
  const rawText = String(text || "").replace(/\r/g, "\n");
  const safeLabel = escapeRegex(String(label || "").trim()).replace(/\s+/g, "\\s+");

  const patterns = [
    new RegExp(`^\\s*${safeLabel}\\s*[:=\\-]\\s*(\\d+(?:\\.\\d+)?)`, "i"),
    new RegExp(`^\\s*${safeLabel}\\s{2,}(\\d+(?:\\.\\d+)?)`, "i"),
    new RegExp(`^\\s*${safeLabel}\\s+(\\d+(?:\\.\\d+)?)`, "i"),
  ];

  for (const line of rawText.split("\n").map((item) => item.trim()).filter(Boolean)) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(match[1]);
        if (!Number.isNaN(value)) {
          return {
            value,
            rawToken: match[1],
            matchedAlias: String(label || "").trim().toLowerCase(),
          };
        }
      }
    }
  }

  return { value: null, rawToken: "", matchedAlias: "" };
};

/**
 * Builds regex patterns for extracting biomarker numeric values
 */
const buildRegexesForAlias = (alias, unit = "") => {
  const safeAlias = escapeRegex(alias).replace(/\s+/g, "\\s+");
  const safeUnit = unit ? escapeRegex(unit) : "";

  const unitPattern = safeUnit
    ? `(?:\\s*(?:${safeUnit}))?`
    : "(?:\\s*[a-zA-Z/%]+)?";

  const subtype = "(?:\\s*\\([^)]{1,30}\\))?";
  const base = `\\b${safeAlias}\\b`;

  return [
    new RegExp(`${base}${subtype}\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)${unitPattern}\\b`, "gi"),
    new RegExp(`${base}${subtype}\\s{2,}(\\d+(?:\\.\\d+)?)${unitPattern}\\b`, "gi"),
    new RegExp(`${base}${subtype}\\s+(\\d+(?:\\.\\d+)?)${unitPattern}\\b`, "gi"),
    new RegExp(`${base}${subtype}\\s*[:=\\-]*\\n\\s*(\\d+(?:\\.\\d+)?)${unitPattern}\\b`, "gi"),
  ];
};

/**
 * Extracts numeric biomarker value from report text
 */
const extractBiomarkerValue = (text, biomarker) => {
  const normalizedText = normalizeText(text);

  const aliases = [biomarker.name, ...(biomarker.aliases || [])]
    .filter(Boolean)
    .map((a) => String(a).trim().toLowerCase());

  for (const alias of aliases) {
    const patterns = buildRegexesForAlias(alias, biomarker.unit);

    for (const pattern of patterns) {
      pattern.lastIndex = 0;

      const match = pattern.exec(normalizedText);

      if (match?.[1]) {
        const value = parseFloat(match[1]);

        if (!Number.isNaN(value)) {
          return {
            value,
            rawToken: match[1],
            matchedAlias: alias,
          };
        }
      }
    }
  }

  return { value: null, rawToken: "", matchedAlias: "" };
};

/**
 * Determines biomarker status using threshold ranges
 */
const resolveStatus = (value, biomarker) => {
  if (value === null || Number.isNaN(value)) return "not-found";

  if (value < biomarker.thresholds.low) return "low";
  if (value > biomarker.thresholds.high) return "high";

  return "normal";
};

/**
 * Calculates score based on deviation from normal range
 */
const calculateScore = (value, biomarker) => {
  if (value === null) return null;

  const { normalMin, normalMax } = biomarker.ranges;
  const range = normalMax - normalMin;

  if (range <= 0) {
    return value >= normalMin && value <= normalMax ? 100 : 30;
  }

  if (value >= normalMin && value <= normalMax) return 100;

  const distance =
    value < normalMin ? normalMin - value : value - normalMax;

  const percent = (distance / range) * 100;

  if (percent <= 10) return 75;
  if (percent <= 25) return 50;

  return 30;
};

/**
 * Determines confidence level of extracted marker
 */
const resolveMarkerConfidence = (value, matchedAlias) => {
  if (value === null || Number.isNaN(value)) return "low";
  if (matchedAlias) return "high";
  return "medium";
};

/**
 * Computes weighted overall health score
 */
const calculateOverallScore = (markers) => {
  const valid = markers.filter(
    (m) => m.status !== "not-found" && m.score !== null
  );

  if (!valid.length) return 0;

  let sum = 0;
  let weightSum = 0;

  valid.forEach((m) => {
    const w = typeof m.weight === "number" ? m.weight : 0;
    sum += m.score * w;
    weightSum += w;
  });

  if (weightSum <= 0) return 0;

  return Math.round(sum / weightSum);
};

const uniqueStrings = (values = []) =>
  Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );

const buildMarkerExplanation = (biomarker, status) => {
  const explanations = biomarker?.explanations || {};

  if (status === "low") return explanations.low || "";
  if (status === "high") return explanations.high || "";
  if (status === "normal") return explanations.normal || "";

  return explanations.notFound || "";
};

const buildRecommendations = (markers) => {
  const immediateActions = [];
  const dailyPractices = [];

  markers.forEach((marker) => {
    const recommendations = marker?.recommendations || {};

    if (marker.status === "low") {
      immediateActions.push(...(recommendations.low?.immediate || []));
      dailyPractices.push(...(recommendations.low?.daily || []));
      return;
    }

    if (marker.status === "high") {
      immediateActions.push(...(recommendations.high?.immediate || []));
      dailyPractices.push(...(recommendations.high?.daily || []));
      return;
    }

    if (marker.status === "normal") {
      dailyPractices.push(...(recommendations.normal?.daily || []));
    }
  });

  return {
    immediateActions: uniqueStrings(immediateActions),
    dailyPractices: uniqueStrings(dailyPractices),
  };
};

const buildSummary = ({ overallScore, detectedCount, totalCount, keyIssues }) => {
  const issueCount = keyIssues.length;

  if (!totalCount) {
    return "No active biomarkers were available for analysis.";
  }

  const baseSummary = `Analysis complete with an overall score of ${overallScore}/100. ${totalCount} biomarkers were found in the report, and ${detectedCount} matched the biomarker database and were analyzed.`;

  if (issueCount) {
    return `${baseSummary} ${issueCount} marker${issueCount === 1 ? " needs" : "s need"} attention.`;
  }

  return `${baseSummary} All matched markers were within range.`;
};

const parseAndAnalyzeMarkers = async (text) => {
  const biomarkers = await Biomarker.find({ isActive: true })
    .select("name aliases unit ranges thresholds weight recommendations explanations priority")
    .lean();

  if (!biomarkers.length) {
    return {
      overallScore: 0,
      summary: "No active biomarkers are configured for analysis.",
      dataQuality: { detected: 0, total: 0, percentage: 0 },
      analysisCoverage: { analyzed: 0, available: 0, percentage: 0 },
      reportBiomarkers: [],
      keyIssues: [],
      markers: [],
      recommendations: { immediateActions: [], dailyPractices: [] },
      confidence: 0,
    };
  }

  const reportBiomarkers = [
    ...new Map(
      [
        ...detectReportBiomarkers(text, biomarkers),
        ...extractReportBiomarkerNames(text),
      ].map((name) => [normalizeBiomarkerKey(name), name])
    ).values(),
  ];
  const biomarkerByKey = new Map();

  biomarkers.forEach((biomarker) => {
    const keys = [biomarker.name, ...(biomarker.aliases || [])].map((value) => normalizeBiomarkerKey(value));
    keys.forEach((key) => {
      if (key) {
        biomarkerByKey.set(key, biomarker);
      }
    });
  });

  const markers = reportBiomarkers.map((reportBiomarkerName) => {
    const biomarker = biomarkerByKey.get(normalizeBiomarkerKey(reportBiomarkerName));

    if (!biomarker) {
      const extracted = extractGenericBiomarkerValue(text, reportBiomarkerName);

      return {
        name: reportBiomarkerName,
        value: extracted.value,
        unit: "",
        status: "not-found",
        score: null,
        confidence: extracted.value === null ? "low" : "medium",
        reviewNote: "This biomarker is not configured in the database yet.",
        explanation: "Not configured in biomarker database yet.",
        weight: 0,
        recommendations: {},
      };
    }

    const extracted = extractBiomarkerValue(text, biomarker);
    const status = resolveStatus(extracted.value, biomarker);

    return {
      name: biomarker.name,
      value: extracted.value,
      unit: biomarker.unit || "",
      status,
      score: calculateScore(extracted.value, biomarker),
      confidence: resolveMarkerConfidence(extracted.value, extracted.matchedAlias),
      reviewNote: status === "not-found" ? "Marker was not detected in the report text." : "",
      explanation: buildMarkerExplanation(biomarker, status),
      weight: typeof biomarker.weight === "number" ? biomarker.weight : 0,
      recommendations: biomarker.recommendations || {},
    };
  });

  const detectedCount = markers.filter((marker) => marker.value !== null && marker.value !== undefined).length;
  const matchedDatabaseCount = markers.filter((marker) => marker.reviewNote !== "This biomarker is not configured in the database yet.").length;
  const totalCount = reportBiomarkers.length;
  const analyzedCount = detectedCount;

  const keyIssues = markers
    .filter((marker) => marker.status === "low" || marker.status === "high")
    .map((marker) => ({
      name: marker.name,
      status: marker.status,
      value: marker.value,
    }));

  const overallScore = calculateOverallScore(markers);
  const recommendations = buildRecommendations(markers);

  const dataQualityPercentage = totalCount
    ? Math.round((matchedDatabaseCount / totalCount) * 100)
    : 0;

  const confidence = totalCount
    ? Math.round((matchedDatabaseCount / totalCount) * 100) / 100
    : 0;

  return {
    overallScore,
    summary: buildSummary({ overallScore, detectedCount: matchedDatabaseCount, totalCount, keyIssues }),
    dataQuality: {
      detected: matchedDatabaseCount,
      total: totalCount,
      percentage: dataQualityPercentage,
    },
    analysisCoverage: {
      analyzed: matchedDatabaseCount,
      available: totalCount,
      percentage: totalCount ? Math.round((matchedDatabaseCount / totalCount) * 100) : 0,
    },
    reportBiomarkers,
    keyIssues,
    markers,
    recommendations,
    confidence,
  };
};

module.exports = {
  parseAndAnalyzeMarkers,
};