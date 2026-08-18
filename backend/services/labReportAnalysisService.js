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

const cleanLabel = (value = "") => {
  let str = String(value || "").trim();
  // Strip leading numbering or bullet prefix: e.g. "1.", "14)", "3-", "4:", "(5)", "1.1", "•", "*"
  str = str.replace(/^(?:\(?\d+(?:\.\d+)?[\.\)\:\-]\s*|[\u2022\u25E6\u2023\u2043\*\-\•]\s*)/, "");
  return str
    .replace(/[_*#|^~`]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:\-\.]+|[\s:\-\.]+$/g, "")
    .trim();
};

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
  "white blood cell count": "White Blood Cells",
  rbc: "Red Blood Cells",
  "red blood count": "Red Blood Cells",
  "red cell count": "Red Blood Cells",
  "red blood cell count": "Red Blood Cells",
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
  /^\s*(?:patient|pt|name|patient\s+name)(?:\s+(?:name|id|no|number))?[\s.:]/i,
  /^\s*(?:doctor|dr|physician|consultant)[\s.:]/i,
  /^\s*(?:report|lab|test)[\s.:]?(?:date|no|number|id)[\s:]/i,
  /^\s*(?:date|dated|issued)[\s.:]/i,
  /^\s*(?:collection|report|sample|test|printed)?\s*(?:date|time)[\s.:]/i,
  /^\s*(?:age|gender|sex|dob|date\s+of\s+birth)[\s.:]/i,
  /^\s*(?:ref|accession|sample|lab|barcode)\s*(?:no|num|number|id)?[\s.:]/i,
  /^\s*(?:id|patient\s+id|report\s+id|sample\s+id|accession\s+id|accession|record|mrn)[\s.:]/i,
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
  /^\s*[\-\s]*page\s+\d+(?:\s*(?:of|\/)\s*\d+)?[\-\s]*$/i, // Page 1 of 7, -- Page 1 --
  /^\s*[\-\s]*\d+\s+(?:of|\/)\s+\d+[\-\s]*$/i, // -- 1 of 7 --, 2/7
  /^\s*[\-\s]*\d+[\-\s]*$/i, // standalone page numbers like "- 1 -"
  // NOTE: reference-range lines are no longer rejected as noise; they are
  // consumed by parseBiomarkerLine / tryParseMultiLineBlock for range extraction.
  /^\s*(?:purpose|expected\s+internal\s+interpretation|expected|test\s+exact|test\s+wbc|test\s+greek|test\s+uppercase|test\s+low|test\s+high|test\s+value|intentionally\s+unsupported)\b/i,
  /^\s*(?:status\s*=|score\s*=|no\s+automatic|no\s+range\s+indicator)\b/i,
];

/**
 * Returns true if a line is almost certainly administrative / header noise
 */
const isNoiseLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return true;

  // Page dividers like "-- 1 of 7 --"
  if (/^[\-\s]*\d+\s+(?:of|\/)\s+\d+[\-\s]*$/i.test(trimmed)) return true;
  if (/^[\-\s]*page\s+\d+(?:\s*(?:of|\/)\s*\d+)?[\-\s]*$/i.test(trimmed)) return true;

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
  /^(?:reference|range|reference\s+range|ref\s+range|normal\s+range|result|unit|units|method|flag|status|value|normal|abnormal|remark|comment|interpretation|purpose|expected|expected\s+internal\s+interpretation)$/i,
  /^(?:test\s+name|parameter|analyte|investigation|laboratory\s+results|patient\s+information|important|synthetic\s+test\s+report)$/i,
  /^(?:name|patient|age|gender|date|doctor|lab|report|sample|specimen|barcode|id|no|administrative|administrative\s+number|sample\s+administrative\s+number)$/i,
];

const isLikelyBiomarkerLabel = (label = "") => {
  const trimmed = cleanLabel(label);
  if (!trimmed || trimmed.length < 2) return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (trimmed.length > 80) return false; // biomarker names are never 80+ chars

  // Reject pure numbers, percentages, range expressions, and unit headers/strings
  if (/^\d+(?:\.\d+)?%?$/.test(trimmed)) return false;
  if (/\d+\s*[\-\–\—\~]\s*\d+/.test(label)) return false;
  if (/^\s*units?[\s:]/i.test(label)) return false;
  if (/^(?:g\/dL|mg\/dL|mmol\/L|umol\/L|u\/L|iu\/L|ng\/mL|pg\/mL|fl|pg|\%|percent|million\/[uµμ]L|10[\^*0-9]+\/[uµμ]L|\/[uµμ]L|U\/L|mIU\/L)$/i.test(trimmed)) return false;
  if (/^[a-zA-Z0-9\/\%µμ\.\-\*\^]+\/[a-zA-Z0-9\/\%µμ\.\-\*\^]+$/i.test(trimmed)) return false;

  const normalized = normalizeBiomarkerKey(trimmed);

  // Reject known noise labels
  if (NOISE_LABEL_PATTERNS.some((p) => p.test(normalized))) return false;

  // A biomarker label should not contain 'reference range' or 'normal range'
  if (/(?:reference|normal|ref\.?)\s*range/i.test(trimmed)) return false;

  // A biomarker label should not contain a complete result + unit pattern
  // (e.g. "Vitamin D 22 ng/mL" should be rejected as a single label)
  if (/\d{1,5}(?:\.\d{1,3})?\s*(?:g\/dL|mg\/dL|mmol\/L|umol\/L|u\/L|iu\/L|ng\/mL|pg\/mL|fl|pg|\%|percent|million\/[uµμ]L|10[\^*0-9]+\/[uµμ]L|\/[uµμ]L|U\/L|mIU\/L)/i.test(trimmed)) {
    return false;
  }

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
  const unitMatch = afterNum.match(/^((?:10[\^\*]\d|x10[\^\*]\d|[a-zA-Z/%µμ])[a-zA-Z0-9/%µμ\.\-\*\^]{0,15})/);
  const unit = unitMatch ? unitMatch[1] : "";

  return { value, unit, rawToken };
};

// ---------------------------------------------------------------------------
// Reference range extraction helper
// ---------------------------------------------------------------------------

/**
 * Attempts to extract a numeric min–max reference range from a text string.
 * Accepts formats like:
 *   "4.0 - 20.0"        "4-20"         "4.0 – 20.0"
 *   "Reference Range: 4.0 - 20.0"     "Normal Range: 0.4 - 4.0"
 *   "Ref Range: 4.0 - 20.0 ng/mL"     "Ref. Range: 4.0-20.0"
 *
 * Returns { min, max, raw } or undefined if no valid range found.
 */
const extractRangeFromText = (text) => {
  if (!text || typeof text !== "string") return undefined;

  const rangeRe = /(?:(?:reference|normal|ref\.?)\s*range[\s:]*)?([<>]?\s*\d+(?:\.\d+)?)\s*[\-–—~]\s*(\d+(?:\.\d+)?)/i;
  const match = text.match(rangeRe);
  if (!match) return undefined;

  const minVal = parseFloat(match[1].replace(/^[<>]\s*/, ""));
  const maxVal = parseFloat(match[2]);

  if (isNaN(minVal) || isNaN(maxVal)) return undefined;
  if (minVal >= maxVal) return undefined;
  if (minVal > 100000 || maxVal > 100000) return undefined; // reject dates/IDs

  return { min: minVal, max: maxVal, raw: match[0].trim() };
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

  // Strip leading numbering or bullets for regex parsing (e.g., "1. Hemoglobin")
  const parsingLine = trimmed.replace(/^(?:\(?\d+(?:\.\d+)?[\.\)\:\-]\s*|[\u2022\u25E6\u2023\u2043\*\-\•]\s*)/, "");

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
    const match = parsingLine.match(pattern);
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
    const afterMatch = parsingLine.slice(match[0].length).trim();
    const unitMatch = afterMatch.match(/^((?:10[\^\*]\d|x10[\^\*]\d|[a-zA-Z/%µμ])[a-zA-Z0-9/%µμ\.\-\*\^]{0,15})/);
    const unit = unitMatch ? unitMatch[1] : "";

    // Attempt to extract a reference range from the text after the unit
    const afterUnit = unitMatch ? afterMatch.slice(unitMatch[0].length).trim() : afterMatch;
    const extractedRange = extractRangeFromText(afterUnit);

    log(`Parsed line: label="${label}" value=${value} unit="${unit}"${extractedRange ? ` range=${extractedRange.raw}` : ""}`);
    return { label, value, rawToken: rawValueStr, unit, ...(extractedRange ? { extractedRange } : {}) };
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

// Helper for multi-line block parsing
const tryParseMultiLineBlock = (lines, startIdx) => {
  const labelLine = lines[startIdx];
  const cleaned = cleanLabel(labelLine);
  if (!isLikelyBiomarkerLabel(cleaned)) return null;

  // Inspect the next 1 to 6 non-noise lines for value, unit, and reference range
  let value = null;
  let unit = "";
  let rawToken = "";
  let consumedLines = 0;
  let extractedRange;

  for (let offset = 1; offset <= 6 && startIdx + offset < lines.length; offset++) {
    const nextLine = lines[startIdx + offset].trim();
    if (!nextLine) continue;

    // Check for reference range line (with explicit prefix) before noise rejection
    // so that "Reference Range: 4.0 - 20.0" is captured, not skipped
    if (value !== null && /^(?:reference|normal|ref\.?)\s*range[\s:]/i.test(nextLine)) {
      const rangeResult = extractRangeFromText(nextLine);
      if (rangeResult) {
        extractedRange = rangeResult;
        consumedLines = offset;
      }
      continue;
    }

    if (isNoiseLine(nextLine)) continue;

    // Stop if nextLine looks like another biomarker label or single line row
    const nextCleaned = cleanLabel(nextLine);
    if (
      parseBiomarkerLine(nextLine) ||
      (offset > 1 && isLikelyBiomarkerLabel(nextCleaned) && !/^(?:result|value)\s*:/i.test(nextLine))
    ) {
      break;
    }

    // Check for Result: 13.0 or Value: 13.0 or raw numeric value
    if (value === null) {
      const valMatch =
        nextLine.match(/^(?:result|value)[\s:]*([<>]?=?\s*\d+(?:\.\d+)?)/i) ||
        nextLine.match(/^([<>]?=?\s*\d+(?:\.\d+)?)\b/);
      if (valMatch) {
        rawToken = valMatch[1].trim();
        const numVal = parseFloat(rawToken.replace(/^[<>]?=?\s*/, ""));
        if (!isNaN(numVal)) {
          value = numVal;
          consumedLines = offset;

          // Check if unit is on the same line after the number
          const remainder = nextLine.slice(valMatch[0].length).trim();
          const unitMatch = remainder.match(/^(?:unit[\s:]*)?((?:10[\^*]\d|x10[\^*]\d|[a-zA-Z/%µμ])[a-zA-Z0-9/%µμ.*^-]{0,15})/i);
          if (unitMatch) {
            unit = unitMatch[1];

            // Check for trailing range on the same line as value+unit
            const afterUnitText = remainder.slice(unitMatch[0].length).trim();
            if (afterUnitText) {
              const rangeResult = extractRangeFromText(afterUnitText);
              if (rangeResult) extractedRange = rangeResult;
            }
          }
          continue;
        }
      }
    }

    // Check for Unit: g/dL line if value is already found but unit is missing
    if (value !== null && !unit) {
      if (/^(?:unit|units)[\s:]*/i.test(nextLine)) {
        unit = nextLine.replace(/^(?:unit|units)[\s:]*/i, "").trim().split(/\s+/)[0];
        consumedLines = offset;
        continue; // don't break — keep scanning for range
      }
      const unitLineMatch = nextLine.match(/^([a-zA-Z/%µμ][a-zA-Z0-9/%µμ.*^-]{0,15})$/);
      if (unitLineMatch) {
        unit = unitLineMatch[1];
        consumedLines = offset;
        continue; // don't break — keep scanning for range
      }
    }

    // If value and unit are found, try extracting a bare range from a subsequent line
    if (value !== null && unit) {
      const rangeResult = extractRangeFromText(nextLine);
      if (rangeResult) {
        extractedRange = rangeResult;
        consumedLines = offset;
        break; // range found, done with this block
      }
      // Line is neither range nor unit — stop scanning
      break;
    }
  }

  if (value !== null) {
    return {
      label: cleaned,
      value,
      unit,
      rawToken,
      consumedLines,
      ...(extractedRange ? { extractedRange } : {}),
    };
  }

  return null;
};

// ---------------------------------------------------------------------------
// Extract biomarker rows from raw text
// ---------------------------------------------------------------------------

/**
 * Returns an array of { label, value, unit, rawToken, extractedRange? } for every
 * real biomarker line found in the report text, stripping header/admin noise.
 * Accepts an optional knownNames Set to enable DB-aware merged-line splitting.
 */
const extractBiomarkerRows = (rawText, knownNames = new Set()) => {
  const rawLines = rawText.split("\n").map((l) => l.replace(/\r/g, "").trimEnd());
  const startIdx = findDataStartLine(rawLines);
  const rows = [];
  const seenLabels = new Set();

  let i = startIdx;
  while (i < rawLines.length) {
    const rawLine = rawLines[i];

    if (!rawLine.trim() || isNoiseLine(rawLine)) {
      i++;
      continue;
    }

    // Expand merged-column lines using DB-known names as anchors
    const subLines =
      knownNames.size > 0
        ? splitMergedLineWithNames(rawLine, knownNames)
        : [rawLine.trim()].filter(Boolean);

    let foundAny = false;
    for (const line of subLines) {
      let parsedSingle = parseBiomarkerLine(line);
      if (parsedSingle) {
        // Look ahead for an explicit reference range on the immediate next line if missing
        if (!parsedSingle.extractedRange && i + 1 < rawLines.length) {
          const nextLine = rawLines[i + 1].trim();
          if (/^(?:reference|normal|ref\.?)\s*range[\s:]/i.test(nextLine)) {
            const range = extractRangeFromText(nextLine);
            if (range) parsedSingle.extractedRange = range;
          }
        }

        const key = normalizeBiomarkerKey(parsedSingle.label);
        if (!seenLabels.has(key)) {
          seenLabels.add(key);
          rows.push(parsedSingle);
        }
        foundAny = true;
      }
    }

    if (foundAny) {
      i++;
      continue;
    }

    // Try multi-line parsing for blocks like:
    // 1. Hemoglobin
    // Result: 13.0
    // Unit: g/dL
    const multiParsed = tryParseMultiLineBlock(rawLines, i);
    if (multiParsed) {
      const key = normalizeBiomarkerKey(multiParsed.label);
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        rows.push({
          label: multiParsed.label,
          value: multiParsed.value,
          unit: multiParsed.unit,
          rawToken: multiParsed.rawToken,
          ...(multiParsed.extractedRange ? { extractedRange: multiParsed.extractedRange } : {}),
        });
      }
      i += Math.max(1, multiParsed.consumedLines + 1);
      continue;
    }

    i++;
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
// Unit Validation Helpers
// ---------------------------------------------------------------------------

const normalizeUnitString = (unit = "") =>
  String(unit || "")
    .replace(/[µμ]/g, "u")
    .toLowerCase()
    .replace(/[^a-z0-9/%^*]/g, "")
    .trim();

/**
 * Compatible unit groups for validation.
 */
const EQUIVALENT_UNIT_GROUPS = [
  ["g/dl", "g/dl.", "g/100ml"],
  ["mg/dl", "mg/dl.", "mg/100ml"],
  ["10^3/ul", "10*3/ul", "103/ul", "10^3/ul.", "k/ul", "k/mm3", "thou/ul", "/ul", "cells/ul"],
  ["10^6/ul", "10*6/ul", "106/ul", "10^6/ul.", "m/ul", "m/mm3", "million/ul", "million/ul."],
  ["u/l", "iu/l", "u/l.", "iu/l."],
  ["ng/ml", "ng/ml.", "ug/l"],
  ["pg/ml", "pg/ml."],
  ["%", "percent"],
  ["fl", "fl."],
  ["pg", "pg."],
  ["g/l", "g/l."],
  ["mmol/l", "mmol/l."],
  ["umol/l", "umol/l."],
];

/**
 * Checks if an extracted unit is compatible with the expected DB biomarker unit.
 * Returns true if extracted unit is empty (unspecified) or compatible.
 */
const validateBiomarkerUnit = (extractedUnit, expectedUnit) => {
  if (!extractedUnit || !expectedUnit) return true; // Accept if report doesn't specify unit

  const normExt = normalizeUnitString(extractedUnit);
  const normExp = normalizeUnitString(expectedUnit);
  if (!normExt || normExt === normExp) return true;

  for (const group of EQUIVALENT_UNIT_GROUPS) {
    if (group.includes(normExt) && group.includes(normExp)) {
      return true;
    }
  }

  return false;
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

/**
 * Calculates marker score based on percentage deviation from normal range:
 * - Within normal range: 100
 * - Deviation <= 10%: 75
 * - Deviation <= 25%: 50
 * - Deviation > 25%: 30
 */
const calculateMarkerScore = (value, biomarker) => {
  if (value === null || isNaN(value)) return null;

  const { normalMin, normalMax } = biomarker.ranges;
  if (typeof normalMin !== "number" || typeof normalMax !== "number") return null;

  const range = normalMax - normalMin;
  if (range <= 0) {
    return value >= normalMin && value <= normalMax ? 100 : 30;
  }

  if (value >= normalMin && value <= normalMax) return 100;

  const distance = value < normalMin ? normalMin - value : value - normalMax;
  const percent = (distance / range) * 100;

  if (percent <= 10) return 75;
  if (percent <= 25) return 50;

  return 30;
};

/**
 * Computes overall health score from valid, matched, scored markers.
 * MISSING, UNSUPPORTED, OR LOW-OCR-CONFIDENCE MARKERS NEVER REDUCE OVERALL SCORE.
 */
const calculateOverallScore = (markers) => {
  const valid = markers.filter(
    (m) =>
      m.status !== "not-found" &&
      m.status !== "unsupported" &&
      m.score !== null &&
      m.confidence !== "low"
  );
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
// Explanation and recommendations helpers (Rule-based wording)
// ---------------------------------------------------------------------------

const buildMarkerExplanation = (biomarker, status, value, normalMin, normalMax, unit) => {
  const ex = biomarker?.explanations || {};
  const u = unit || biomarker?.unit || "";
  const unitSuffix = u ? ` ${u}` : "";

  if (status === "low") {
    return ex.low || `Observed value (${value}${unitSuffix}) is below the configured reference range (${normalMin} - ${normalMax}${unitSuffix}).`;
  }
  if (status === "high") {
    return ex.high || `Observed value (${value}${unitSuffix}) is above the configured reference range (${normalMin} - ${normalMax}${unitSuffix}).`;
  }
  if (status === "normal") {
    return ex.normal || `Observed value (${value}${unitSuffix}) falls within the configured reference range (${normalMin} - ${normalMax}${unitSuffix}).`;
  }
  if (status === "unsupported") {
    return `Unit could not be verified. This result was excluded from automatic scoring.`;
  }
  return ex.notFound || "Value could not be determined from the report.";
};

const uniqueStrings = (values = []) =>
  Array.from(new Set(values.map((v) => String(v || "").trim()).filter(Boolean)));

const buildRecommendations = (markers) => {
  const immediateActions = [];
  const dailyPractices = [];

  for (const m of markers) {
    if (m.confidence === "low" || m.status === "unsupported") continue; // Exclude invalid/unreliable markers from recs
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
    return "No valid biomarkers were detected in the uploaded document. Rule-based analysis requires a recognized lab report.";
  }
  const issueCount = keyIssues.length;
  const base = `Rule-based evaluation complete with an overall score of ${overallScore}/100 based on configured reference ranges. ${matchedCount} biomarker(s) were evaluated against stored reference ranges${unmatchedCount > 0 ? `, and ${unmatchedCount} additional test(s) were detected without matching reference rules` : ""}.`;
  if (issueCount) {
    return `${base} ${issueCount} marker(s) fall outside configured normal ranges.`;
  }
  return `${base} All evaluated markers fall within configured normal ranges.`;
};

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

const parseAndAnalyzeMarkers = async (text, options = {}) => {
  const { ocrConfidence = 100 } = typeof options === "number" ? { ocrConfidence: options } : options;
  const isGlobalLowConfidence = typeof ocrConfidence === "number" && ocrConfidence < 70;

  const biomarkers = await Biomarker.find({ isActive: true })
    .select("name aliases unit ranges thresholds weight recommendations explanations priority mentalHealthRelevance")
    .lean();

  if (!biomarkers.length) {
    return {
      overallScore: 0,
      summary: "No active biomarkers are configured for rule-based analysis.",
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

  // Build flat sets for merged-line splitting
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
  for (const fullName of Object.values(ALIAS_EXPANSION)) {
    knownNames.add(fullName.toLowerCase().trim());
    originalNames.add(fullName.trim());
  }

  // 2. Extract biomarker rows from the raw OCR text
  const rawRows = extractBiomarkerRows(text, knownNames);
  log(`Extracted ${rawRows.length} biomarker rows from OCR text`);

  if (rawRows.length === 0) {
    return {
      overallScore: 0,
      summary: "No valid biomarkers were detected in the uploaded document. Please upload a clear medical lab report.",
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

  // 3. Match each row to DB biomarker & validate
  const matchedMarkers = [];
  const unmatchedMarkers = [];

  for (const row of rawRows) {
    const dbBiomarker = resolveBiomarkerFromLabel(row.label, dbLookup);

    if (dbBiomarker) {
      let normalMin = dbBiomarker.ranges.normalMin;
      let normalMax = dbBiomarker.ranges.normalMax;
      let lowThresh = dbBiomarker.thresholds.low;
      let highThresh = dbBiomarker.thresholds.high;
      let rangeSource = "Medi-Link configured range";

      // Report-specific reference range override
      // If the report provides a valid range, use it instead of DB defaults
      const rr = row.extractedRange;
      if (
        rr &&
        typeof rr.min === "number" &&
        typeof rr.max === "number" &&
        isFinite(rr.min) &&
        isFinite(rr.max) &&
        rr.min < rr.max
      ) {
        normalMin = rr.min;
        normalMax = rr.max;
        lowThresh = rr.min;
        highThresh = rr.max;
        rangeSource = "Laboratory report";
        log(`Using report-specific range for ${row.label}: ${rr.min} - ${rr.max} (raw: ${rr.raw})`);
        // Skip WBC/Platelet 1000x scaling — report range is already in the report's value scale
      } else {
        // Fallback: Handle unit scaling with DB ranges: WBC / Platelet thousand scaling
        if ((dbBiomarker.name === "White Blood Cells" || dbBiomarker.name === "Platelet Count") && typeof row.value === "number" && row.value < 2000) {
          normalMin = normalMin / 1000;
          normalMax = normalMax / 1000;
          lowThresh = lowThresh / 1000;
          highThresh = highThresh / 1000;
        }
      }

      const scaledBiomarker = {
        ...dbBiomarker,
        ranges: { normalMin, normalMax },
        thresholds: { low: lowThresh, high: highThresh },
      };

      // Unit Validation
      const isUnitSupported = validateBiomarkerUnit(row.unit, dbBiomarker.unit);

      let status;
      let score;
      let reviewNote = "";
      let confidenceLevel = "high";

      if (!isUnitSupported) {
        status = "unsupported";
        score = null; // NEVER reduces overall score
        confidenceLevel = "low";
        reviewNote = "Review recommended: unit is unsupported or incompatible with configured reference ranges.";
      } else if (isGlobalLowConfidence || row.lowConfidence) {
        status = resolveStatus(row.value, scaledBiomarker);
        score = null; // OCR low confidence: set score null so it NEVER reduces overall score
        confidenceLevel = "low";
        reviewNote = "Review recommended: low OCR confidence extraction.";
      } else {
        status = resolveStatus(row.value, scaledBiomarker);
        score = calculateMarkerScore(row.value, scaledBiomarker);
        confidenceLevel = "high";
        reviewNote = status === "not-found" ? "Marker was not detected in the report text." : "";
      }

      const explanation = buildMarkerExplanation(dbBiomarker, status, row.value, normalMin, normalMax, row.unit || dbBiomarker.unit);

      matchedMarkers.push({
        name: dbBiomarker.name,
        value: row.value,
        unit: row.unit || dbBiomarker.unit || "",
        status,
        score,
        confidence: confidenceLevel,
        reviewNote,
        explanation,
        weight: typeof dbBiomarker.weight === "number" ? dbBiomarker.weight : 0.3,
        recommendations: dbBiomarker.recommendations || {},
        normalMin,
        normalMax,
        normalRange: `${normalMin} - ${normalMax}`,
        rangeSource,
        mentalHealthRelevance: dbBiomarker.mentalHealthRelevance || "",
      });
    } else {
      // Real biomarker row found in report but not configured in DB
      matchedMarkers.push({
        name: row.label,
        value: row.value,
        unit: row.unit || "",
        status: "unsupported",
        score: null,
        confidence: "medium",
        reviewNote: "Review recommended: biomarker is not configured in the database.",
        explanation: "Unit could not be verified. This result was excluded from automatic scoring.",
        weight: 0,
        recommendations: {},
        normalMin: null,
        normalMax: null,
        normalRange: "Unknown",
        rangeSource: "Medi-Link configured range",
        mentalHealthRelevance: "",
      });
    }
  }

  // 4. Compute overall score from valid, matched DB biomarkers only
  const overallScore = calculateOverallScore(matchedMarkers);
  const recommendations = buildRecommendations(matchedMarkers);

  const keyIssues = matchedMarkers
    .filter((m) => m.status === "low" || m.status === "high")
    .map((m) => ({ name: m.name, status: m.status, value: m.value }));

  const matchedCount = matchedMarkers.length;
  const unmatchedCount = unmatchedMarkers.length;
  const totalDetected = matchedCount + unmatchedCount;

  const reportBiomarkers = matchedMarkers.map((m) => m.name);
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
  validateBiomarkerUnit,
  calculateMarkerScore,
  calculateOverallScore,
  extractBiomarkerRows,
  cleanLabel,
  parseBiomarkerLine,
  resolveBiomarkerFromLabel,
  buildBiomarkerLookup,
  ALIAS_EXPANSION,
  extractRangeFromText,
};
