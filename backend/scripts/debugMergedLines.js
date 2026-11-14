require("dotenv").config();
const connectDB = require("../config/db");
const { parseAndAnalyzeMarkers } = require("../services/labReportAnalysisService");

// Simulating what pdf-parse returns for a table-structured PDF
// where columns get merged into a single long line (common pdf-parse issue)
const mergedTableText = `CITY MEDICAL LABORATORY
No. 45, Main Street, Colombo
Tel: 011-2345678
LABORATORY TEST REPORT
Patient Name: Nimal Perera Age: 35 years Gender: Male
Report Date: 07/07/2026 Doctor: Dr. Amal Fernando
Test: Complete Blood Count (CBC)
Test Name Result Unit Reference Range
Hemoglobin 11.2 g/dL 13.0 - 17.0
White Blood Cells 7800 /uL 4000 - 11000
Red Blood Cells 4.2 million/uL 4.5 - 5.9
Platelet Count 250000 /uL 150000 - 450000
Hematocrit 36 % 40 - 50
MCV 82 fL 80 - 100
MCH 27 pg 27 - 33
MCHC 33 g/dL 32 - 36
Test: Blood Sugar
Fasting Blood Sugar 145 mg/dL 70 - 100
Test: Lipid Profile
Total Cholesterol 220 mg/dL Less than 200
LDL Cholesterol 145 mg/dL Less than 100
HDL Cholesterol 42 mg/dL Greater than 40
Triglycerides 180 mg/dL Less than 150
Lab Technician: S. Jayawardena`;

// What pdf-parse ACTUALLY gives for columnar table PDFs (all columns on one line)
const compressedToOneLine = `CITY MEDICAL LABORATORY
No. 45, Main Street, Colombo Tel: 011-2345678
LABORATORY TEST REPORT
Patient Name: Nimal Perera Age: 35 years Gender: Male Report Date: 07/07/2026 Doctor: Dr. Amal Fernando
Test: Complete Blood Count (CBC)
Test Name Result Unit Reference Range
Hemoglobin 11.2 g/dL 13.0 - 17.0 White Blood Cells 7800 /uL 4000 - 11000 Red Blood Cells 4.2 million/uL 4.5 - 5.9 Platelet Count 250000 /uL 150000 - 450000 Hematocrit 36 % 40 - 50 MCV 82 fL 80 - 100 MCH 27 pg 27 - 33 MCHC 33 g/dL 32 - 36
Test: Blood Sugar Fasting Blood Sugar 145 mg/dL 70 - 100
Test: Lipid Profile Total Cholesterol 220 mg/dL Less than 200 LDL Cholesterol 145 mg/dL Less than 100 HDL Cholesterol 42 mg/dL Greater than 40 Triglycerides 180 mg/dL Less than 150
Lab Technician: S. Jayawardena`;

connectDB().then(async () => {
  console.log("=== Scenario A: Lines are properly separated ===");
  const r1 = await parseAndAnalyzeMarkers(mergedTableText);
  console.log("Matched:", r1.reportBiomarkers);
  console.log("Score:", r1.overallScore);

  console.log("\n=== Scenario B: Table columns merged onto single lines (pdf-parse issue) ===");
  const r2 = await parseAndAnalyzeMarkers(compressedToOneLine);
  console.log("Matched:", r2.reportBiomarkers);
  console.log("Unmatched:", r2.unmatchedMarkers.map(m => m.name));
  console.log("Score:", r2.overallScore);

  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
