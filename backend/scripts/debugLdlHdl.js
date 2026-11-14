require("dotenv").config();
const connectDB = require("../config/db");
const { parseAndAnalyzeMarkers } = require("../services/labReportAnalysisService");

// Simulate the split lines from a merged-line parse, each line separately
const lines = [
  "LDL Cholesterol 145 mg/dL Less than 100",
  "HDL Cholesterol 42 mg/dL Greater than 40",
  "Total Cholesterol 220 mg/dL Less than 200",
  "Triglycerides 180 mg/dL Less than 150",
  "Hemoglobin 11.2 g/dL 13.0 - 17.0",
  "Hematocrit 36 % 40 - 50",
  "MCV 82 fL 80 - 100",
];

// Run each line alone through parseAndAnalyzeMarkers to isolate the issue
connectDB().then(async () => {
  for (const line of lines) {
    const r = await parseAndAnalyzeMarkers(line);
    console.log(JSON.stringify(line), "->", r.reportBiomarkers, r.unmatchedMarkers.map((m) => m.name));
  }
  process.exit(0);
}).catch((e) => { console.error(e.message); process.exit(1); });
