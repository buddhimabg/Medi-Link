require("dotenv").config();
const path = require("path");
const fs = require("fs");
const connectDB = require("../config/db");
const { extractTextFromReport } = require("../services/labReportOcrService");
const { parseAndAnalyzeMarkers } = require("../services/labReportAnalysisService");

const runTest = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await connectDB();

    console.log("\n--- TEST 1: Testing on simulated sample lab report text ---");
    const sampleText = `
MEDILINK CLINIC
No. 25, Main Road, Colombo Tel: 011-2345678
Patient Name: John Doe   Age: 45   Sex: Male
Report Date: 2026-07-07  Ref No: LAB-100293

TEST NAME                      RESULT     UNIT         REFERENCE RANGE
----------------------------------------------------------------------
Hemoglobin                     13.8       g/dL         13.0 - 17.0
White Blood Cells              7.2        10^3/uL      4.0 - 10.0
Red Blood Cells                4.9        10^6/uL      4.5 - 5.9
Platelet Count                 240        10^3/uL      150 - 450
Fasting Blood Sugar            115        mg/dL        70 - 99
Total Cholesterol              210        mg/dL        < 200
LDL Cholesterol                135        mg/dL        < 100
HDL Cholesterol                45         mg/dL        > 40
Triglycerides                  160        mg/dL        < 150
Serum Creatinine               0.9        mg/dL        0.7 - 1.3
ALT                            28         U/L          7 - 56
AST                            24         U/L          10 - 40
Vitamin D                      22         ng/mL        30 - 100
`;

    console.log("Analyzing simulated sample report...");
    const sampleResult = await parseAndAnalyzeMarkers(sampleText);
    console.log(`Overall Score: ${sampleResult.overallScore}/100`);
    console.log(`Summary: ${sampleResult.summary}`);
    console.log(`Matched Biomarkers (${sampleResult.reportBiomarkers.length}):`, sampleResult.reportBiomarkers);
    console.log("Key Issues:", sampleResult.keyIssues);
    console.log("Unmatched Markers:", sampleResult.unmatchedMarkers.map(m => m.name));

    console.log("\n--- TEST 2: Testing on existing uploaded PDF files in backend/uploads ---");
    const uploadsDir = path.join(__dirname, "../uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".pdf"));
      console.log(`Found ${files.length} PDF files in uploads directory.`);

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        console.log(`\nTesting PDF: ${file}`);
        try {
          const text = await extractTextFromReport({ filePath });
          console.log(`Extracted Text Length: ${text.length} chars. First 150 chars:\n"${text.slice(0, 150)}..."`);
          const result = await parseAndAnalyzeMarkers(text);
          console.log(`-> Overall Score: ${result.overallScore}`);
          console.log(`-> Matched Biomarkers (${result.reportBiomarkers.length}):`, result.reportBiomarkers);
          if (result.unmatchedMarkers.length) {
            console.log(`-> Unmatched Markers (${result.unmatchedMarkers.length}):`, result.unmatchedMarkers.map(m => m.name));
          }
        } catch (err) {
          console.error(`Error processing ${file}:`, err.message);
        }
      }
    } else {
      console.log("No uploads directory found.");
    }

    console.log("\n✅ Test completed!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
};

runTest();
