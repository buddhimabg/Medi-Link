const Biomarker = require("../models/biomarker.js");

/**
 * Debug switch for development logging
 * Set true only when debugging parsing issues
 */
const DEBUG_MODE = false;

const log = (message, data = "") => {
  if (DEBUG_MODE) {
    console.log(`[LAB-REPORT] ${message}`, data);
  }
};

// ---------------------------------------------------------------------------
// Text normalization helpers
// ---------------------------------------------------------------------------

const normalizeText = (text) =>
  String(text || "")
    .replace(/\r/g, "\n")
    .replace(/['']/g, "'")
    .replace(/["""''\"]/g, '"')
    .toLowerCase();

const normalizeBiomarkerKey = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const cleanLabel = (value = "") =>
  String(value || "")
    .replace(/[_*#|^~`]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:\-\.]+|[\s:\-\.]+$/g, "")
    .trim();

// ---------------------------------------------------------------------------
// Common biomarker alias map for abbreviation expansion
// ---------------------------------------------------------------------------
const ALIAS_EXPANSION = {
  hb: "Hemoglobin",
  hgb: "Hemoglobin",
  haemoglobin: "Hemoglobin",
  wbc: "White Blood Cells",
  "white blood count": "White Blood Cells",
  "white cell count": "White Blood Cells",
  rbc: "Red Blood Cells",
  "red blood count": "Red Blood Cells",
  "red cell count": "Red Blood Cells",
  hct: "Hematocrit",
  haematocrit: "Hematocrit",
  "packed cell volume": "Hematocrit",
  pcv: "Hematocrit",
  plt: "Platelet Count",
  platelets: "Platelet Count",
  "platelet count": "Platelet Count",
  fbs: "Fasting Blood Sugar",
  "fasting blood glucose": "Fasting Blood Sugar",
  "blood sugar fasting": "Fasting Blood Sugar",
  fbg: "Fasting Blood Sugar",
  "total cholesterol": "Total Cholesterol",
  "cholesterol total": "Total Cholesterol",
  ldl: "LDL Cholesterol",
  "ldl-c": "LDL Cholesterol",
  "low density lipoprotein": "LDL Cholesterol",
  hdl: "HDL Cholesterol",
  "hdl-c": "HDL Cholesterol",
  "high density lipoprotein": "HDL Cholesterol",
  tg: "Triglycerides",
  trigs: "Triglycerides",
  triglyceride: "Triglycerides",
  "serum triglycerides": "Triglycerides",
  mcv: "MCV",
  "mean corpuscular volume": "MCV",
  mch: "MCH",
  "mean corpuscular hemoglobin": "MCH",
  "mean corpuscular haemoglobin": "MCH",
  mchc: "MCHC",
  "mean corpuscular hemoglobin concentration": "MCHC",
  "mean corpuscular haemoglobin concentration": "MCHC",
  tsh: "TSH",
  "thyroid stimulating hormone": "TSH",
  "serum creatinine": "Creatinine",
  creatinine: "Creatinine",
  bun: "Blood Urea Nitrogen",
  "blood urea": "Blood Urea Nitrogen",
  "urea nitrogen": "Blood Urea Nitrogen",
  alt: "ALT",
  sgpt: "ALT",
  "alanine aminotransferase": "ALT",
  ast: "AST",
  sgot: "AST",
  "aspartate aminotransferase": "AST",
  "serum albumin": "Albumin",
  albumin: "Albumin",
  "total bilirubin": "Total Bilirubin",
  bilirubin: "Total Bilirubin",
  "serum uric acid": "Uric Acid",
  "uric acid": "Uric Acid",
  "blood glucose": "Fasting Blood Sugar",
  glucose: "Fasting Blood Sugar",
  "serum glucose": "Fasting Blood Sugar",
  "random blood sugar": "Random Blood Sugar",
  rbs: "Random Blood Sugar",
  "rbc count": "Red Blood Cells",
  "wbc count": "White Blood Cells",
  "hb level": "Hemoglobin",
};

// ---------------------------------------------------------------------------
// Line rejection helpers – skip header / patient / admin lines
// ---------------------------------------------------------------------------

/**
 * Patterns that clearly identify non-biomarker lines (address, header, contacts, etc.)
 */
const NOISE_LINE_PATTERNS = [
  /^\s*tel(?:ephone)?[\s:]/i,
  /^\s*fax[\s:]/i,
  /^\s*phone[\s:]/i,
  /^\s*email[\s:]/i,
  /^\s*web(?:site)?[\s:]/i,
  /^\s*(?:patient|pt)(?:\s+(?:name|id|no|number))?[\s:]/i,
  /^\s*(?:doctor|dr|physician|consultant)[\s.:]/i,
  /^\s*(?:report|lab|test)[\s.:]?(?:date|no|number|id)[\s:]/i,
  /^\s*(?:date|dated|issued)[\s.:]/i,
  /^\s*(?:age|gender|sex|dob|date\s+of\s+birth)[\s.:]/i,
  /^\s*(?:ref|accession|sample|lab|barcode)\s*(?:no|num|number|id)?[\s.:]/i,
  /^\s*(?:specimen|collected|received|reported|validated)\b/i,
  /^\s*(?:signature|signed|validated\s+by|technician|pathologist|approved\s+by)\b/i,
  /^\s*(?:no\.|no\s+)\d+[,\s]/i, // address numbers like "No. 25, Main Road"
  /^\s*(?:address|location|branch|clinic|laboratory|hospital|centre|center)\b/i,
  /\b(?:main\s+road|street|avenue|lane|colombo|kandy|galle|negombo)\b/i, // Sri Lankan addresses
  /^\s*\d{2,4}[\-\/]\d{2}[\-\/]\d{2,4}\s*$/, // standalone date lines
  /^\s*(?:test\s+name|parameter|analyte|investigation)\s+result/i, // table header rows
  /^\s*[-=_*]{4,}\s*$/, // separator lines
  /\b(?:\d{3,}-\d{4,}|\+\d{2,}[\s\-]\d{4,})\b/, // phone numbers embedded in lines
  /^\s*(?:page\s+\d|print(?:ed)?|copy)\b/i,
];

/**
 * Returns true if a line is almost certainly administrative / header noise
 */
const isNoiseLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return true;

  // All-caps short lines that are likely lab/clinic names (e.g. "MEDILINK CLINIC")
  if (/^[A-Z\s\-\.&]{5,}$/.test(trimmed) && trimmed.length < 50) return true;

  // Lines that look like clinic name + address in one
  if (/CLINIC|LABORATORY|LAB\b|MEDICAL|HOSPITAL|HEALTH\s+CENTRE/i.test(trimmed) &&
      trimmed.length < 80) return true;

  return NOISE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
};

/**
 * True if a line's "label" portion looks like a real biomarker name:
 * - Contains letters
 * - Not too short
 * - Not a known noise keyword
 */
const NOISE_LABEL_PATTERNS = [
  /^(?:reference|range|result|unit|units|method|flag|status|value|normal|abnormal|remark|comment|interpretation)$/i,
  /^(?:test\s+name|parameter|analyte|investigation)$/i,
  /^(?:name|patient|age|gender|date|doctor|lab|report|sample|specimen|barcode|id|no)$/i,
];

const isLikelyBiomarkerLabel = (label = "") => {
  const trimmed = cleanLabel(label);
  if (!trimmed || trimmed.length < 2) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (trimmed.length > 80) return false; // biomarker names are never 80+ chars

  // Reject pure numbers or percentages
  if (/^\d+(?:\.\d+)?%?$/.test(trimmed)) return false;

  const normalized = normalizeBiomarkerKey(trimmed);

  // Reject known noise labels
  if (NOISE_LABEL_PATTERNS.some((p) => p.test(normalized))) return false;

  // Must have at least 2 alphabetic characters
  const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (alphaCount < 2) return false;

  return true;
};

// ---------------------------------------------------------------------------
// Value extraction helpers
// ---------------------------------------------------------------------------

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Extracts the first plausible numeric value from a line that follows the label.
 * Handles: "Hemoglobin  11.2  g/dL  13.0-17.0"
 *          "Hemoglobin: 11.2 g/dL"
 *          "Hb 11.2"
 * Returns { value: number|null, unit: string, rawToken: string }
 */
const parseLineForValue = (line, label) => {
  const afterLabel = line
    .slice(line.toLowerCase().indexOf(label.toLowerCase()) + label.length)
    .trim()
    .replace(/^[\s:=\-]+/, "");

  // Match first numeric token (possibly decimal)
  const numMatch = afterLabel.match(/^(<|>|>=|<=)?\s*(\d{1,10}(?:[.,]\d{1,6})?)/);
  if (!numMatch) return { value: null, unit: "", rawToken: "" };

  const rawToken = numMatch[0];
  const numStr = numMatch[2].replace(",", ".");
  const value = parseFloat(numStr);
  if (isNaN(value)) return { value: null, unit: "", rawToken: "" };

  // Sanity: platelet counts can be 250000 but "No. 25" is address
  // If the label is very short (2-3 chars), reject very large values that look like phone/zip
  if (label.length <= 3 && value > 99999 && !/platelet|plt/i.test(label)) {
    return { value: null, unit: "", rawToken: "" };
  }

  // Extract unit if present right after the number
  const afterNum = afterLabel.slice(rawToken.length).trim();
  const unitMatch = afterNum.match(/^([a-zA-Z/%µμ][a-zA-Z0-9/%µμ\.\-]{0,15})/);
  const unit = unitMatch ? unitMatch[1] : "";

  return { value, unit, rawToken };
};

// ---------------------------------------------------------------------------
// Structured line parser: extract label + value from one report line
// ---------------------------------------------------------------------------

/**
 * Try to parse a single OCR text line as "LABEL  VALUE [UNIT] [REF_RANGE]".
 * Returns { label, value, unit, rawToken } or null if line is not a test row.
 */
const parseBiomarkerLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 4) return null;
  if (isNoiseLine(trimmed)) return null;

  // Patterns for label+value extraction:
  // 1. "Label : value"  or  "Label = value"
  // 2. "Label   value"  (2+ spaces separation)
  // 3. "Label value" (single space, label must match known biomarker list)

  const patterns = [
    // e.g. "Hemoglobin : 11.2"  or  "Hb: 11.2"
    /^([A-Za-z][A-Za-z0-9\s\(\)\/\+\-\.]{0,60}?)\s*[:=]\s*(\d{1,10}(?:[.,]\d{1,6})?)/,
    // e.g. "Hemoglobin   11.2"  (2+ whitespace separating label from number)
    /^([A-Za-z][A-Za-z0-9\s\(\)\/\+\-\.]{0,60}?)\s{2,}(\d{1,10}(?:[.,]\d{1,6})?)/,
    // e.g. "Hemoglobin 11.2"  (1 space – only if label is plausible)
    /^([A-Za-z][A-Za-z0-9\s\(\)\/\+\-\.]{2,60}?)\s+(\d{1,10}(?:[.,]\d{1,6})?)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const rawLabel = match[1].trim();
    const label = cleanLabel(rawLabel);

    if (!isLikelyBiomarkerLabel(label)) continue;

    // The label must NOT look like an address/header component
    if (isNoiseLine(label)) continue;

    const rawValueStr = match[2].replace(",", ".");
    const value = parseFloat(rawValueStr);
    if (isNaN(value)) continue;

    // Reject implausible standalone address numbers:
    // "No. 25, Main Road..." → label "No" is too short and suspicious
    if (label.length < 3 && !/^(?:Hb|Hg|Na|Fe|Ca|K|pH|pO|pC|WBC|RBC|MCV|MCH|MCH|TSH|HDL|LDL|ALT|AST)$/i.test(label)) {
      continue;
    }

    // Extract unit from remainder
    const afterMatch = trimmed.slice(match[0].length).trim();
    const unitMatch = afterMatch.match(/^([a-zA-Z/%µμ][a-zA-Z0-9/%µμ\.\-]{0,15})/);
    const unit = unitMatch ? unitMatch[1] : "";

    log(`Parsed line: label="${label}" value=${value} unit="${unit}"`);
    return { label, value, rawToken: rawValueStr, unit };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Strip header block before actual test data begins
// ---------------------------------------------------------------------------

/**
 * Find the line index where actual test data likely starts.
 * We look for a line that contains known header markers like "test name" + "result"
 * or the first line that has a real biomarker pattern.
 */
const findDataStartLine = (lines) => {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    // Table header often contains "test name" or "parameter" and "result"
    if (/\btest\s+name\b/.test(line) && /\bresult\b/.test(line)) return i + 1;
    if (/\bparameter\b/.test(line) && /\bresult\b/.test(line)) return i + 1;
    if (/\binvestigation\b/.test(line) && /\bresult\b/.test(line)) return i + 1;
    if (/\banalyte\b/.test(line) && /\bvalue\b/.test(line)) return i + 1;
  }
  return 0; // No table header found – process all lines (noise filtering will handle it)
};

// ---------------------------------------------------------------------------
// Split merged table lines (pdf-parse artefact)
// ---------------------------------------------------------------------------

/**
 * pdf-parse often collapses all rows of a table into a single line:
 *   "Hemoglobin 11.2 g/dL 13.0-17.0 White Blood Cells 7800 /uL ..."
 *
 * This function splits such lines using the actual DB biomarker names and aliases
 * as anchors so that multi-word names like "Red Blood Cells" are kept intact.
 *
 * @param {string} line  - The raw text line to process
 * @param {Set<string>} knownNames - Set of biomarker names+aliases (lowercase, trimmed)
 * @returns {string[]} - One or more sub-lines
 */
const splitMergedLineWithNames = (line, knownNames) => {
  const trimmed = line.trim();
  if (!trimmed) return [];

  // Quick exit: if there are < 2 "word(s) + number" groups, not merged
  const mergeCount = (trimmed.match(/[A-Za-z][A-Za-z ]{1,30}\s+\d{1,7}(?:[.,]\d+)?/g) || []).length;
  if (mergeCount < 2) return [trimmed];

  // Use names >= 4 chars as split anchors, OR short pure-alpha names (2-4 chars) which
  // are acronyms like mcv, mch, ldl, hdl stored lowercase in knownNames.
  const sortedNames = Array.from(knownNames)
    .filter((n) => n.length >= 4 || /^[a-z]{2,4}$/.test(n))
    .sort((a, b) => b.length - a.length);

  // Step 1: Find all name spans in the trimmed line (sorted longest-first so longer names win)
  // A span is { pos, len, name }
  const spans = [];
  for (const name of sortedNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRe = new RegExp(`(?<![a-zA-Z])${escaped}(?![a-zA-Z])`, "gi");
    let m;
    while ((m = nameRe.exec(trimmed)) !== null) {
      const pos = m.index;
      const len = m[0].length;
      // Only accept this span if it doesn't overlap with an already-claimed longer span
      const overlaps = spans.some((s) => pos < s.pos + s.len && pos + len > s.pos);
      if (!overlaps) {
        spans.push({ pos, len, name });
      }
    }
  }

  // Step 2: Collect split positions from spans that:
  //  (a) start after position 0 (not the first biomarker)
  //  (b) are preceded by a space
  //  (c) the text before the name ends with a digit/unit (i.e., a value has just ended)
  const splitPositions = new Set();
  for (const { pos } of spans) {
    if (pos === 0) continue;
    if (trimmed[pos - 1] !== " ") continue;
    const before = trimmed.slice(0, pos).trimEnd();
    if (/\d/.test(before.slice(-1)) || /[a-zA-Z/%µμ]/.test(before.slice(-1))) {
      splitPositions.add(pos);
    }
  }

  if (splitPositions.size === 0) return [trimmed];

  // Step 3: Build sub-lines from sorted split positions
  const positions = [0, ...Array.from(splitPositions).sort((a, b) => a - b), trimmed.length];
  const parts = [];
  for (let i = 0; i < positions.length - 1; i++) {
    const part = trimmed.slice(positions[i], positions[i + 1]).trim();
    if (part) parts.push(part);
  }

  return parts.length > 1 ? parts : [trimmed];
};


// ---------------------------------------------------------------------------
// Extract biomarker rows from raw text
// ---------------------------------------------------------------------------

/**
 * Returns an array of { label, value, unit, rawToken } for every real biomarker
 * line found in the report text, stripping header/admin noise.
 * Accepts an optional knownNames Set to enable DB-aware merged-line splitting.
 */
const extractBiomarkerRows = (rawText, knownNames = new Set()) => {
  const rawLines = rawText.split("\n").map((l) => l.replace(/\r/g, "").trimEnd());
  const startIdx = findDataStartLine(rawLines);
  const rows = [];
  const seenLabels = new Set();

  for (let i = startIdx; i < rawLines.length; i++) {
    // Expand merged-column lines using DB-known names as anchors
    const subLines =
      knownNames.size > 0
        ? splitMergedLineWithNames(rawLines[i], knownNames)
        : [rawLines[i].trim()].filter(Boolean);

    for (const line of subLines) {
      const parsed = parseBiomarkerLine(line);
      if (!parsed) continue;

      const key = normalizeBiomarkerKey(parsed.label);
      if (seenLabels.has(key)) continue;
      seenLabels.add(key);
      rows.push(parsed);
    }
  }

  return rows;
};

// ---------------------------------------------------------------------------
// Build biomarker lookup map from DB records (by name + aliases)
// ---------------------------------------------------------------------------

const buildBiomarkerLookup = (biomarkers) => {
  const map = new Map();

  for (const bm of biomarkers) {
    const names = [bm.name, ...(bm.aliases || [])].filter(Boolean);
    for (const name of names) {
      const key = normalizeBiomarkerKey(name);
      if (key && !map.has(key)) {
        map.set(key, bm);
      }
    }
  }

  // Also register ALIAS_EXPANSION abbreviations
  for (const [abbr, fullName] of Object.entries(ALIAS_EXPANSION)) {
    const abbKey = normalizeBiomarkerKey(abbr);
    const fullKey = normalizeBiomarkerKey(fullName);
    if (!map.has(abbKey) && map.has(fullKey)) {
      map.set(abbKey, map.get(fullKey));
    }
  }

  return map;
};

/**
 * Resolve a row label to a DB biomarker entry, using:
 * 1. Exact key match
 * 2. Alias expansion map
 * 3. Partial/prefix matching (for partial OCR)
 */
const resolveBiomarkerFromLabel = (label, dbLookup) => {
  const key = normalizeBiomarkerKey(label);
  const words = key.split(/\s+/).filter(Boolean);

  // 1. Exact match
  if (dbLookup.has(key)) return dbLookup.get(key);

  // 2. ALIAS_EXPANSION map
  const expanded = ALIAS_EXPANSION[label.toLowerCase().trim()];
  if (expanded) {
    const expandedKey = normalizeBiomarkerKey(expanded);
    if (dbLookup.has(expandedKey)) return dbLookup.get(expandedKey);
  }

  // 3. Partial prefix match: label key must be a prefix of the DB key
  // (handles partial OCR like "Hemoglob" → "Hemoglobin")
  // We do NOT do arbitrary word-subset matching as it causes false positives
  // e.g. "LDL Cholesterol" wrongly matching "Total Cholesterol"
  if (key.length >= 4) {
    for (const [mapKey, bm] of dbLookup) {
      if (mapKey.startsWith(key) || key.startsWith(mapKey)) return bm;
    }
  }

  // 4. Single-word lookup: if label is an acronym or short abbreviation
  if (words.length === 1 && words[0].length >= 2) {
    for (const [mapKey, bm] of dbLookup) {
      if (mapKey.startsWith(key) || mapKey === key) return bm;
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Classifies a biomarker numeric value against low/high thresholds (low, high, normal, not-found).
 */
const resolveStatus = (value, biomarker) => {
  if (value === null || isNaN(value)) return "not-found";
  if (value < biomarker.thresholds.low) return "low";
  if (value > biomarker.thresholds.high) return "high";
  return "normal";
};

const calculateMarkerScore = (value, biomarker) => {
  if (value === null || isNaN(value)) return null;
  const { normalMin, normalMax } = biomarker.ranges;
  const range = normalMax - normalMin;

  if (range <= 0) return value >= normalMin && value <= normalMax ? 100 : 30;
  if (value >= normalMin && value <= normalMax) return 100;

  const distance = value < normalMin ? normalMin - value : value - normalMax;
  const percent = (distance / range) * 100;
  if (percent <= 10) return 75;
  if (percent <= 25) return 50;
  return 30;
};

const calculateOverallScore = (markers) => {
  const valid = markers.filter((m) => m.status !== "not-found" && m.score !== null);
  if (!valid.length) return 0;

  let sum = 0;
  let weightSum = 0;
  for (const m of valid) {
    const w = typeof m.weight === "number" && m.weight > 0 ? m.weight : 0.3;
    sum += m.score * w;
    weightSum += w;
  }
  return weightSum > 0 ? Math.round(sum / weightSum) : 0;
};

// ---------------------------------------------------------------------------
// Explanation and recommendations helpers
// ---------------------------------------------------------------------------

const buildMarkerExplanation = (biomarker, status) => {
  const ex = biomarker?.explanations || {};
  if (status === "low") return ex.low || `${biomarker.name} is below the normal range.`;
  if (status === "high") return ex.high || `${biomarker.name} is above the normal range.`;
  if (status === "normal") return ex.normal || `${biomarker.name} is within the normal range.`;
  return ex.notFound || "Value could not be determined from the report.";
};

const uniqueStrings = (values = []) =>
  Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));

const buildRecommendations = (markers) => {
  const immediateActions = [];
  const dailyPractices = [];

  for (const m of markers) {
    const recs = m?.recommendations || {};
    if (m.status === "low") {
      immediateActions.push(...(recs.low?.immediate || []));
      dailyPractices.push(...(recs.low?.daily || []));
    } else if (m.status === "high") {
      immediateActions.push(...(recs.high?.immediate || []));
      dailyPractices.push(...(recs.high?.daily || []));
    } else if (m.status === "normal") {
      dailyPractices.push(...(recs.normal?.daily || []));
    }
  }

  return {
    immediateActions: uniqueStrings(immediateActions),
    dailyPractices: uniqueStrings(dailyPractices),
  };
};

const buildSummary = ({ overallScore, matchedCount, unmatchedCount, totalDetected, keyIssues }) => {
  if (totalDetected === 0) {
    return "No valid biomarkers were detected. Please upload a clear medical lab report.";
  }
  const issueCount = keyIssues.length;
  const base = `Analysis complete with an overall health score of ${overallScore}/100. ${matchedCount} biomarkers were matched against the database and analyzed${unmatchedCount > 0 ? `, and ${unmatchedCount} additional test(s) were detected but are not yet in the database` : ""}.`;
  if (issueCount) {
    return `${base} ${issueCount} marker${issueCount === 1 ? " needs" : "s need"} attention.`;
  }
  return `${base} All matched markers were within the normal range.`;
};

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

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
      unmatchedMarkers: [],
      recommendations: { immediateActions: [], dailyPractices: [] },
      confidence: 0,
    };
  }

  // 1. Build DB lookup map
  const dbLookup = buildBiomarkerLookup(biomarkers);

  // Build flat sets for merged-line splitting:
  //   knownNames     = lowercased  (for case-insensitive search in split function)
  //   originalNames  = original-case DB names + aliases (for uppercase acronym detection)
  const knownNames = new Set();
  const originalNames = new Set();
  for (const bm of biomarkers) {
    knownNames.add(bm.name.toLowerCase().trim());
    originalNames.add(bm.name.trim());
    for (const alias of bm.aliases || []) {
      if (alias) {
        knownNames.add(alias.toLowerCase().trim());
        originalNames.add(alias.trim());
      }
    }
  }
  // Also add ALIAS_EXPANSION target names
  for (const fullName of Object.values(ALIAS_EXPANSION)) {
    knownNames.add(fullName.toLowerCase().trim());
    originalNames.add(fullName.trim());
  }

  // 2. Extract biomarker rows from the raw OCR text (with DB-aware line splitting)
  const rawRows = extractBiomarkerRows(text, knownNames);
  log(`Extracted ${rawRows.length} biomarker rows from OCR text`);

  if (rawRows.length === 0) {
    return {
      overallScore: 0,
      summary: "No valid biomarkers were detected. Please upload a clear medical lab report.",
      dataQuality: { detected: 0, total: 0, percentage: 0 },
      analysisCoverage: { analyzed: 0, available: 0, percentage: 0 },
      reportBiomarkers: [],
      keyIssues: [],
      markers: [],
      unmatchedMarkers: [],
      recommendations: { immediateActions: [], dailyPractices: [] },
      confidence: 0,
    };
  }

  // 3. Match each row to DB biomarker
  const matchedMarkers = [];
  const unmatchedMarkers = [];

  for (const row of rawRows) {
    const dbBiomarker = resolveBiomarkerFromLabel(row.label, dbLookup);

    if (dbBiomarker) {
      let normalMin = dbBiomarker.ranges.normalMin;
      let normalMax = dbBiomarker.ranges.normalMax;
      let lowThresh = dbBiomarker.thresholds.low;
      let highThresh = dbBiomarker.thresholds.high;

      // Handle unit scaling: when WBC or Platelets are reported in thousands (e.g. WBC = 7.2 instead of 7200, Platelets = 240 instead of 240,000)
      if ((dbBiomarker.name === "White Blood Cells" || dbBiomarker.name === "Platelet Count") && typeof row.value === "number" && row.value < 2000) {
        normalMin = normalMin / 1000;
        normalMax = normalMax / 1000;
        lowThresh = lowThresh / 1000;
        highThresh = highThresh / 1000;
      }

      const scaledBiomarker = {
        ...dbBiomarker,
        ranges: { normalMin, normalMax },
        thresholds: { low: lowThresh, high: highThresh },
      };

      const status = resolveStatus(row.value, scaledBiomarker);
      const score = calculateMarkerScore(row.value, scaledBiomarker);

      matchedMarkers.push({
        name: dbBiomarker.name,
        value: row.value,
        unit: row.unit || dbBiomarker.unit || "",
        status,
        score,
        confidence: "high",
        reviewNote: status === "not-found" ? "Marker was not detected in the report text." : "",
        explanation: buildMarkerExplanation(dbBiomarker, status),
        weight: typeof dbBiomarker.weight === "number" ? dbBiomarker.weight : 0.3,
        recommendations: dbBiomarker.recommendations || {},
        normalMin,
        normalMax,
        normalRange: `${normalMin} - ${normalMax}`,
      });
    } else {
      // Real biomarker row found in the report but not in DB
      unmatchedMarkers.push({
        name: row.label,
        value: row.value,
        unit: row.unit || "",
        status: "not-found",
        score: null,
        confidence: "medium",
        reviewNote: "This biomarker is not yet configured in the database.",
        explanation: "Not configured in biomarker database yet.",
        weight: 0,
        recommendations: {},
      });
    }
  }

  // 4. Compute overall score from matched DB biomarkers only
  const overallScore = calculateOverallScore(matchedMarkers);
  const recommendations = buildRecommendations(matchedMarkers);

  const keyIssues = matchedMarkers
    .filter((m) => m.status === "low" || m.status === "high")
    .map((m) => ({ name: m.name, status: m.status, value: m.value }));

  const matchedCount = matchedMarkers.length;
  const unmatchedCount = unmatchedMarkers.length;
  const totalDetected = matchedCount + unmatchedCount;

  // reportBiomarkers = only the properly DB-matched names (drives UI card list)
  const reportBiomarkers = matchedMarkers.map((m) => m.name);

  // markers includes both matched and unmatched for backward-compat with the DB record
  const allMarkers = [...matchedMarkers, ...unmatchedMarkers];

  const dataQualityPercentage = totalDetected
    ? Math.round((matchedCount / totalDetected) * 100)
    : 0;

  return {
    overallScore,
    summary: buildSummary({ overallScore, matchedCount, unmatchedCount, totalDetected, keyIssues }),
    dataQuality: {
      detected: matchedCount,
      total: totalDetected,
      percentage: dataQualityPercentage,
    },
    analysisCoverage: {
      analyzed: matchedCount,
      available: totalDetected,
      percentage: dataQualityPercentage,
    },
    reportBiomarkers,
    keyIssues,
    markers: allMarkers,
    unmatchedMarkers,
    recommendations,
    confidence: totalDetected ? matchedCount / totalDetected : 0,
  };
};

module.exports = {
  parseAndAnalyzeMarkers,
};