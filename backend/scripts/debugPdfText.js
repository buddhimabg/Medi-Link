require("dotenv").config();
const { readFile } = require("fs/promises");
const { PDFParse } = require("pdf-parse");
const path = require("path");
const fs = require("fs");

const connectDB = require("../config/db");
const { parseAndAnalyzeMarkers } = require("../services/labReportAnalysisService");

const uploadsDir = path.join(__dirname, "../uploads");

const normalizeText = (text = "") =>
  String(text)
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const testPdf = async (filePath) => {
  const fileBuffer = await readFile(filePath);
  const parser = new PDFParse({ data: fileBuffer });

  try {
    const result = await parser.getText();
    const text = normalizeText(result?.text);
    console.log(`\n--- FILE: ${path.basename(filePath)} ---`);
    console.log(`Direct text length: ${text.length}`);
    console.log(`First 500 chars:\n"${text.slice(0, 500)}"`);
    
    if (text.length >= 40) {
      const analysis = await parseAndAnalyzeMarkers(text);
      console.log(`Matched biomarkers (${analysis.reportBiomarkers.length}):`, analysis.reportBiomarkers);
      console.log(`Unmatched (${analysis.unmatchedMarkers.length}):`, analysis.unmatchedMarkers.map(m => m.name));
      console.log(`Score: ${analysis.overallScore}`);
    } else {
      console.log("Text too short for analysis.");
    }
  } finally {
    await parser.destroy();
  }
};

connectDB().then(async () => {
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".pdf"));
  console.log(`Testing ${files.length} PDF files...`);
  for (const file of files) {
    await testPdf(path.join(uploadsDir, file));
  }
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
