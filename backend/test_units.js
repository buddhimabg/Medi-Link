const {
  validateBiomarkerUnit,
  cleanLabel,
  parseBiomarkerLine,
  extractBiomarkerRows
} = require("./services/labReportAnalysisService");

const text1 = `White Blood Cell Count
Result: 7.8
Unit: 10^3/uL
Reference Range: 4000 - 11000`;

const text2 = `Red Blood Cell Count
Result: 4.5
Unit: million/μL
Reference Range: 4.5 - 5.9`;

const biomarkers = new Set(["white blood cells", "white blood cell count", "wbc", "red blood cells", "red blood cell count", "rbc"]);

const rows1 = extractBiomarkerRows(text1, biomarkers);
console.log("WBC rows:", rows1);

const rows2 = extractBiomarkerRows(text2, biomarkers);
console.log("RBC rows:", rows2);

const normalizeUnitString = (unit = "") =>
  String(unit || "")
    .replace(/[µμ]/g, "u")
    .toLowerCase()
    .replace(/[^a-z0-9/%^*]/g, "")
    .trim();

console.log("Normalized WBC unit:", normalizeUnitString(rows1[0]?.unit));
console.log("Validate WBC:", validateBiomarkerUnit(rows1[0]?.unit, "/µL"));

console.log("Normalized RBC unit:", normalizeUnitString(rows2[0]?.unit));
console.log("Validate RBC:", validateBiomarkerUnit(rows2[0]?.unit, "million/µL"));

