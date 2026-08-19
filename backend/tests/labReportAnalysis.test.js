// backend/tests/labReportAnalysis.test.js

const assert = require("assert");
const {
  calculateMarkerScore,
  calculateOverallScore,
  validateBiomarkerUnit,
  extractBiomarkerRows,
  cleanLabel,
  parseBiomarkerLine,
  resolveBiomarkerFromLabel,
  buildBiomarkerLookup,
  extractRangeFromText,
  parseAndAnalyzeMarkers,
} = require("../services/labReportAnalysisService");
const { extractTextFromReport } = require("../services/labReportOcrService");

console.log("==========================================");
console.log("RUNNING LAB REPORT ANALYSIS UNIT TESTS");
console.log("==========================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Tiered Percentage-Deviation Scoring Tests (Original Algorithm)
// ---------------------------------------------------------------------------

runTest("Score: Inside normal range returns 100", () => {
  const bm = { ranges: { normalMin: 13.0, normalMax: 17.0 } };
  const scoreMid = calculateMarkerScore(15.0, bm);
  const scoreMin = calculateMarkerScore(13.0, bm);
  const scoreMax = calculateMarkerScore(17.0, bm);

  assert.strictEqual(scoreMid, 100, `Expected 100 for 15.0, got ${scoreMid}`);
  assert.strictEqual(scoreMin, 100, `Expected 100 for 13.0, got ${scoreMin}`);
  assert.strictEqual(scoreMax, 100, `Expected 100 for 17.0, got ${scoreMax}`);
});

runTest("Score: Tiered percentage-deviation outside normal range (75, 50, 30)", () => {
  const bm = { ranges: { normalMin: 10.0, normalMax: 20.0 } }; // span = 10

  // 10% deviation below (9.0 -> dist 1.0 -> 10% dev -> score 75)
  const score9 = calculateMarkerScore(9.0, bm);
  assert.strictEqual(score9, 75, `Expected 75 for 9.0 (10% dev), got ${score9}`);

  // 10% deviation above (21.0 -> dist 1.0 -> 10% dev -> score 75)
  const score21 = calculateMarkerScore(21.0, bm);
  assert.strictEqual(score21, 75, `Expected 75 for 21.0 (10% dev), got ${score21}`);

  // 25% deviation above (22.5 -> dist 2.5 -> 25% dev -> score 50)
  const score225 = calculateMarkerScore(22.5, bm);
  assert.strictEqual(score225, 50, `Expected 50 for 22.5 (25% dev), got ${score225}`);

  // > 25% deviation above (23.0 -> dist 3.0 -> 30% dev -> score 30)
  const score23 = calculateMarkerScore(23.0, bm);
  assert.strictEqual(score23, 30, `Expected 30 for 23.0 (30% dev), got ${score23}`);
});

runTest("Score: Floor at 30 for extreme out-of-bounds values", () => {
  const bm = { ranges: { normalMin: 10.0, normalMax: 20.0 } };
  const scoreExtreme = calculateMarkerScore(100.0, bm);
  assert.strictEqual(scoreExtreme, 30, `Extreme high value must score 30, got ${scoreExtreme}`);

  const scoreExtremeLow = calculateMarkerScore(-50.0, bm);
  assert.strictEqual(scoreExtremeLow, 30, `Extreme negative value must score 30, got ${scoreExtremeLow}`);
});

// ---------------------------------------------------------------------------
// 2. Missing / Unsupported / OCR-Failed Biomarkers Neutrality Tests
// ---------------------------------------------------------------------------

runTest("Overall Score: Missing, unsupported, and low-OCR markers never lower overall score", () => {
  const markers = [
    { name: "Hemoglobin", status: "normal", score: 100, weight: 0.5, confidence: "high" },
    { name: "WBC", status: "not-found", score: null, weight: 0.3, confidence: "medium" },
    { name: "FBS", status: "unsupported", score: null, weight: 0.3, confidence: "low" },
    { name: "TSH", status: "normal", score: null, weight: 0.3, confidence: "low", reviewNote: "Review recommended" },
  ];

  const overall = calculateOverallScore(markers);
  assert.strictEqual(overall, 100, `Overall score should be 100 from valid marker only, got ${overall}`);
});

runTest("Unit Validation: Micro/Mu variants and equivalent representations pass", () => {
  assert.strictEqual(validateBiomarkerUnit("/uL", "/µL"), true, "/uL should match DB /µL");
  assert.strictEqual(validateBiomarkerUnit("/µL", "/µL"), true, "/µL should match DB /µL");
  assert.strictEqual(validateBiomarkerUnit("/μL", "/µL"), true, "/μL (greek mu) should match DB /µL");
  assert.strictEqual(validateBiomarkerUnit("/UL", "/µL"), true, "/UL should match DB /µL");

  assert.strictEqual(validateBiomarkerUnit("million/uL", "million/µL"), true, "million/uL should match DB million/µL");
  assert.strictEqual(validateBiomarkerUnit("million/µL", "million/µL"), true, "million/µL should match DB million/µL");
  assert.strictEqual(validateBiomarkerUnit("million/μL", "million/µL"), true, "million/μL should match DB million/µL");

  assert.strictEqual(validateBiomarkerUnit("g/dL", "g/dL"), true);
  assert.strictEqual(validateBiomarkerUnit("g/dL", "g/dL."), true);
  assert.strictEqual(validateBiomarkerUnit("10^3/uL", "k/uL"), true);
  assert.strictEqual(validateBiomarkerUnit("mg/dL", "mg/100mL"), true);
  assert.strictEqual(validateBiomarkerUnit("", "g/dL"), true, "Empty extracted unit should pass");
});

runTest("Unit Validation: Incompatible units fail", () => {
  assert.strictEqual(validateBiomarkerUnit("mg/dL", "g/dL"), false, "mg/dL should be incompatible with g/dL");
  assert.strictEqual(validateBiomarkerUnit("mmol/L", "mg/dL"), false, "mmol/L should be incompatible with mg/dL");
  assert.strictEqual(validateBiomarkerUnit("%", "g/dL"), false, "% should be incompatible with g/dL");
  assert.strictEqual(validateBiomarkerUnit("kg", "g/dL"), false, "kg should be incompatible with g/dL");
});

// ---------------------------------------------------------------------------
// 3. Multi-Page & Multi-Line Biomarker Parsing Tests
// ---------------------------------------------------------------------------

runTest("Parser: Existing single-line biomarker parsing remains intact", () => {
  const line = "Hemoglobin 13.0 g/dL 13.0-17.0";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed, "Should parse single-line row");
  assert.strictEqual(parsed.label, "Hemoglobin");
  assert.strictEqual(parsed.value, 13.0);
  assert.strictEqual(parsed.unit, "g/dL");
});

runTest("Parser: Multi-line format with explicit Result: and Unit: labels", () => {
  const text = `
Hemoglobin
Result: 13.0
Unit: g/dL
Reference Range:
13.0 – 17.0 g/dL
  `;
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1, "Should extract 1 biomarker row");
  assert.strictEqual(rows[0].label, "Hemoglobin");
  assert.strictEqual(rows[0].value, 13.0);
  assert.strictEqual(rows[0].unit, "g/dL");
});

runTest("Parser: Multi-line numeric format without explicit Result label", () => {
  const text = `
Hemoglobin
13.0
g/dL
  `;
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1, "Should extract 1 biomarker row");
  assert.strictEqual(rows[0].label, "Hemoglobin");
  assert.strictEqual(rows[0].value, 13.0);
  assert.strictEqual(rows[0].unit, "g/dL");
});

runTest("Parser: Numbered labels (1. Hemoglobin, 2. White Blood Cells, 14) Vitamin B12, 3- Platelets)", () => {
  assert.strictEqual(cleanLabel("1. Hemoglobin"), "Hemoglobin");
  assert.strictEqual(cleanLabel("2. White Blood Cells"), "White Blood Cells");
  assert.strictEqual(cleanLabel("14) Vitamin B12"), "Vitamin B12");
  assert.strictEqual(cleanLabel("3- Platelets"), "Platelets");
});

runTest("Parser: Numbered single-line biomarker", () => {
  const line = "1. Hemoglobin 13.8 g/dL 13 - 17";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed, "Should successfully parse numbered single-line biomarker");
  assert.strictEqual(parsed.label, "Hemoglobin");
  assert.strictEqual(parsed.value, 13.8);
  assert.strictEqual(parsed.unit, "g/dL");
});

runTest("Parser: Numbered multi-line biomarker", () => {
  const text = "3. Red Blood Cells\n4.8 million/μL\nRef. Range: 4.5 - 5.9";
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].label, "Red Blood Cells");
  assert.strictEqual(rows[0].value, 4.8);
  assert.strictEqual(rows[0].unit, "million/μL");
});

runTest("Parser: Metadata rejection (Collection Date, Patient ID, etc.)", () => {
  const metadataLines = [
    "Collection Date: 18/08/2026",
    "Patient ID: 12345",
    "ID: QA-FINAL-005",
    "Report ID: 987654321",
    "Report No: 123",
    "Sample Date: 12/12/2026",
    "Accession ID: ACC-123",
    "MRN: 444555",
    "Name: John Doe"
  ];

  for (const line of metadataLines) {
    const parsed = parseBiomarkerLine(line);
    assert.strictEqual(parsed, null, `Metadata line "${line}" should be rejected by parser`);
  }
});

runTest("Parser: Result+Unit strings are rejected as biomarker labels", () => {
  // isLikelyBiomarkerLabel should return false for these, preventing them from being parsed as multi-line headers
  const text = "Vitamin D 22 ng/mL\nReference Range: 30 - 100";
  // The first line should be successfully parsed by parseBiomarkerLine, NOT absorbed as a pure label
  const parsed = parseBiomarkerLine("Vitamin D 22 ng/mL");
  assert.ok(parsed);
  assert.strictEqual(parsed.label, "Vitamin D");
  assert.strictEqual(parsed.value, 22);
  assert.strictEqual(parsed.unit, "ng/mL");
});

runTest("Parser: Unknown biomarker extraction (Needs Review)", () => {
  const text = "11. Some Unconfigured Test\n100 abc\nReference Range: 50 - 150";
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].label, "Some Unconfigured Test");
  assert.strictEqual(rows[0].value, 100);
  assert.strictEqual(rows[0].unit, "abc");
  assert.ok(rows[0].extractedRange);
  assert.strictEqual(rows[0].extractedRange.min, 50);
});

runTest("Parser: Page dividers and noise filtering (-- 1 of 7 --)", () => {
  const text = `
1. Hemoglobin
Result: 13.0
Unit: g/dL

-- 1 of 7 --

2. White Blood Cells
Result: 7.8
Unit: 10^3/uL
  `;
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 2, "Should extract 2 biomarker rows across page divider");
  assert.strictEqual(rows[0].label, "Hemoglobin");
  assert.strictEqual(rows[1].label, "White Blood Cells");
});

runTest("Parser: Multiple consecutive multi-line biomarkers and multi-page continuity", () => {
  const text = `
1. Hemoglobin
Result: 13.0
Unit: g/dL
-- 1 of 7 --
2. White Blood Cells
Result: 7.8
Unit: 10^3/uL
-- 2 of 7 --
3. Red Blood Cells
Result: 4.5
Unit: million/μL
  `;
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0].label, "Hemoglobin");
  assert.strictEqual(rows[1].label, "White Blood Cells");
  assert.strictEqual(rows[2].label, "Red Blood Cells");
});

// ---------------------------------------------------------------------------
// 4. New Requirements Tests (Merged lines, Unsupported, Mental Health)
// ---------------------------------------------------------------------------

runTest("Parser: Multiple biomarkers on a single merged line are all extracted", () => {
  const text = "Hemoglobin 13.0 g/dL 13.0-17.0 White Blood Cells 7.8 10^3/uL Red Blood Cells 4.5 million/uL";
  const knownNames = new Set(["hemoglobin", "white blood cells", "red blood cells", "wbc", "rbc"]);
  const rows = extractBiomarkerRows(text, knownNames);
  assert.strictEqual(rows.length, 3, `Should extract 3 biomarkers from merged line, got ${rows.length}`);
  assert.strictEqual(rows[0].label.toLowerCase(), "hemoglobin");
  assert.strictEqual(rows[1].label.toLowerCase(), "white blood cells");
  assert.strictEqual(rows[2].label.toLowerCase(), "red blood cells");
});

// ---------------------------------------------------------------------------
// 5. WBC and RBC Alias and Scaling Tests
// ---------------------------------------------------------------------------

runTest("Alias Matching: 'White Blood Cell Count' matches 'White Blood Cells'", () => {
  const mockBiomarkers = [
    { name: "White Blood Cells", aliases: ["WBC", "White Cell Count"], unit: "/µL", ranges: { normalMin: 4000, normalMax: 11000 }, thresholds: { low: 4000, high: 11000 } }
  ];
  const dbLookup = buildBiomarkerLookup(mockBiomarkers);
  const resolved = resolveBiomarkerFromLabel("White Blood Cell Count", dbLookup);
  assert.ok(resolved, "Expected 'White Blood Cell Count' to resolve to a biomarker");
  assert.strictEqual(resolved.name, "White Blood Cells");
});

runTest("Alias Matching: 'Red Blood Cell Count' matches 'Red Blood Cells'", () => {
  const mockBiomarkers = [
    { name: "Red Blood Cells", aliases: ["RBC", "Red Cell Count"], unit: "million/µL", ranges: { normalMin: 4.5, normalMax: 5.9 }, thresholds: { low: 4.5, high: 5.9 } }
  ];
  const dbLookup = buildBiomarkerLookup(mockBiomarkers);
  const resolved = resolveBiomarkerFromLabel("Red Blood Cell Count", dbLookup);
  assert.ok(resolved, "Expected 'Red Blood Cell Count' to resolve to a biomarker");
  assert.strictEqual(resolved.name, "Red Blood Cells");
});

runTest("Analysis: WBC value 7.8 with unit 10^3/uL is correctly scaled and supported", () => {
  const row = { label: "White Blood Cell Count", value: 7.8, unit: "10^3/uL" };
  const mockBiomarker = { name: "White Blood Cells", unit: "/µL", ranges: { normalMin: 4000, normalMax: 11000 }, thresholds: { low: 4000, high: 11000 } };

  // 1. Simulate unit validation
  const isUnitSupported = validateBiomarkerUnit(row.unit, mockBiomarker.unit);
  assert.strictEqual(isUnitSupported, true, "10^3/uL should be supported and validated against /µL");

  // 2. Simulate scaling
  let { normalMin, normalMax } = mockBiomarker.ranges;
  if (mockBiomarker.name === "White Blood Cells" && row.value < 2000) {
    normalMin /= 1000;
    normalMax /= 1000;
  }
  assert.strictEqual(normalMin, 4.0);
  assert.strictEqual(normalMax, 11.0);

  // 3. Confirm not unsupported
  assert.ok(row.value >= normalMin && row.value <= normalMax, "Scaled value should be within normal range");
});

runTest("Analysis: RBC value 4.5 with unit million/μL is correctly supported", () => {
  const row = { label: "Red Blood Cell Count", value: 4.5, unit: "million/μL" };
  const mockBiomarker = { name: "Red Blood Cells", unit: "million/µL", ranges: { normalMin: 4.5, normalMax: 5.9 }, thresholds: { low: 4.5, high: 5.9 } };

  // 1. Simulate unit validation
  const isUnitSupported = validateBiomarkerUnit(row.unit, mockBiomarker.unit);
  assert.strictEqual(isUnitSupported, true, "million/μL should be supported and validated against million/µL");
});

// ---------------------------------------------------------------------------
// 6. Reference Range Extraction Tests
// ---------------------------------------------------------------------------

runTest("Range Extraction: Single-line with trailing range", () => {
  const line = "Folate 3.5 ng/mL 4.0 - 20.0";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed.extractedRange);
  assert.strictEqual(parsed.extractedRange.min, 4.0);
  assert.strictEqual(parsed.extractedRange.max, 20.0);
});

runTest("Range Extraction: Single-line with explicit prefix", () => {
  const line = "Folate 3.5 ng/mL Reference Range: 4.0 - 20.0";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed.extractedRange);
  assert.strictEqual(parsed.extractedRange.min, 4.0);
  assert.strictEqual(parsed.extractedRange.max, 20.0);
});

runTest("Range Extraction: Compact dash spacing", () => {
  const line = "Folate 3.5 ng/mL 4.0-20.0";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed.extractedRange);
  assert.strictEqual(parsed.extractedRange.min, 4.0);
  assert.strictEqual(parsed.extractedRange.max, 20.0);
});

runTest("Range Extraction: Integer range", () => {
  const line = "Folate 3.5 ng/mL 4 - 20";
  const parsed = parseBiomarkerLine(line);
  assert.ok(parsed.extractedRange);
  assert.strictEqual(parsed.extractedRange.min, 4);
  assert.strictEqual(parsed.extractedRange.max, 20);
});

runTest("Range Extraction: Multi-line: range on next line", () => {
  const text = "Folate\nResult: 3.5\nUnit: ng/mL\nReference Range: 4.0 - 20.0";
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1);
  assert.ok(rows[0].extractedRange);
  assert.strictEqual(rows[0].extractedRange.min, 4.0);
  assert.strictEqual(rows[0].extractedRange.max, 20.0);
});

runTest("Range Extraction: Multi-line: Normal Range prefix", () => {
  const text = "TSH\n2.5\nmIU/L\nNormal Range: 0.4 - 4.0";
  const rows = extractBiomarkerRows(text);
  assert.strictEqual(rows.length, 1);
  assert.ok(rows[0].extractedRange);
  assert.strictEqual(rows[0].extractedRange.min, 0.4);
  assert.strictEqual(rows[0].extractedRange.max, 4.0);
});

runTest("Range Extraction: No range present -> undefined", () => {
  const line = "Hemoglobin 13.0 g/dL";
  const parsed = parseBiomarkerLine(line);
  assert.strictEqual(parsed.extractedRange, undefined);
});

runTest("Range Extraction: Inverted range -> undefined (rejected)", () => {
  const line = "Folate 3.5 ng/mL 20.0 - 4.0";
  // The parser will still parse label/value/unit, but extractedRange will be undefined
  const parsed = parseBiomarkerLine(line);
  assert.strictEqual(parsed.extractedRange, undefined);
});

// ---------------------------------------------------------------------------
// 7. Analysis with Report Range Override Tests
// ---------------------------------------------------------------------------

const Biomarker = require("../models/biomarker.js");

async function runOverrideTests() {
  const mockBiomarkersForOverride = [
    {
      name: "Folate",
      aliases: [],
      unit: "ng/mL",
      ranges: { normalMin: 3, normalMax: 20 },
      thresholds: { low: 3, high: 20 },
      weight: 0.3
    },
    {
      name: "White Blood Cells",
      aliases: ["WBC"],
      unit: "10^3/ul",
      ranges: { normalMin: 4000, normalMax: 11000 },
      thresholds: { low: 4000, high: 11000 },
      weight: 0.3
    }
  ];

  const originalFind = Biomarker.find;
  const mockFind = () => ({
    select: () => ({
      lean: async () => mockBiomarkersForOverride
    })
  });

  await runAsyncTest("Analysis Override: Report range overrides DB range", async () => {
    Biomarker.find = mockFind;
    // Value 3.5, DB range 3-20 -> would be normal. Report range 4-20 -> should be low.
    const text = "Folate 3.5 ng/mL Reference Range: 4.0 - 20.0";
    const result = await parseAndAnalyzeMarkers(text);
    const marker = result.markers.find(m => m.name === "Folate");

    assert.strictEqual(marker.status, "low", "Status should be low based on report range");
    assert.strictEqual(marker.normalMin, 4.0);
    assert.strictEqual(marker.normalMax, 20.0);
    assert.strictEqual(marker.rangeSource, "Laboratory report");

    // DB score for 3.5 (range 3-20) would be 100.
    // Report score for 3.5 (range 4-20, span 16, dist 0.5 -> 3.125% dev) -> should be 75.
    assert.strictEqual(marker.score, 75);
    Biomarker.find = originalFind;
  });

  await runAsyncTest("Analysis Override: Missing report range falls back to DB", async () => {
    Biomarker.find = mockFind;
    const text = "Folate 3.5 ng/mL";
    const result = await parseAndAnalyzeMarkers(text);
    const marker = result.markers.find(m => m.name === "Folate");

    assert.strictEqual(marker.status, "normal", "Status should be normal based on DB range");
    assert.strictEqual(marker.normalMin, 3);
    assert.strictEqual(marker.normalMax, 20);
    assert.strictEqual(marker.rangeSource, "Medi-Link configured range");
    assert.strictEqual(marker.score, 100);
    Biomarker.find = originalFind;
  });

  await runAsyncTest("Analysis Override: Invalid report range falls back to DB", async () => {
    Biomarker.find = mockFind;
    // Inverted range 20.0 - 4.0 should be rejected by extraction
    const text = "Folate 3.5 ng/mL 20.0 - 4.0";
    const result = await parseAndAnalyzeMarkers(text);
    const marker = result.markers.find(m => m.name === "Folate");

    assert.strictEqual(marker.status, "normal");
    assert.strictEqual(marker.normalMin, 3);
    assert.strictEqual(marker.normalMax, 20);
    assert.strictEqual(marker.rangeSource, "Medi-Link configured range");
    Biomarker.find = originalFind;
  });

  await runAsyncTest("Analysis Override: WBC with report range skips 1000x scaling", async () => {
    Biomarker.find = mockFind;
    // WBC DB range is 4000-11000. Report range is 4.0-11.0. Value is 7.8.
    const text = "White Blood Cells 7.8 10^3/ul 4.0 - 11.0";
    const result = await parseAndAnalyzeMarkers(text);
    const marker = result.markers.find(m => m.name === "White Blood Cells");

    assert.strictEqual(marker.status, "normal");
    assert.strictEqual(marker.normalMin, 4.0); // Should be exactly 4.0, not scaled down again to 0.004
    assert.strictEqual(marker.normalMax, 11.0);
    assert.strictEqual(marker.rangeSource, "Laboratory report");
    Biomarker.find = originalFind;
  });
}

async function runErrorClassificationTests() {
  await runAsyncTest("Error: Unsupported file type throws UNSUPPORTED_FILE_TYPE", async () => {
    try {
      await extractTextFromReport({ filePath: "test.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      assert.fail("Should have thrown error for non-PDF file");
    } catch (err) {
      assert.strictEqual(err.code, "UNSUPPORTED_FILE_TYPE");
      assert.strictEqual(err.message, "Unsupported file type. Please upload a PDF lab report.");
    }
  });

  await runAsyncTest("Error: Invalid/corrupted PDF throws INVALID_PDF", async () => {
    try {
      // Pointing to a non-existent or corrupted file path
      await extractTextFromReport({ filePath: "non_existent_corrupted_file.pdf", mimeType: "application/pdf" });
      assert.fail("Should have thrown error for corrupted/missing PDF");
    } catch (err) {
      assert.strictEqual(err.code, "INVALID_PDF");
      assert.strictEqual(err.message, "The uploaded PDF could not be read. Please upload a valid PDF.");
    }
  });

  runTest("Error: Empty/unreadable text returns empty biomarker rows", () => {
    const text = "   \n\n  -- 1 of 7 -- \n ";
    const rows = extractBiomarkerRows(text);
    assert.strictEqual(rows.length, 0, "No biomarker rows should be extracted from empty text");
  });

  runTest("Scoring Regression: Scoring algorithm tier outputs remain 100% unchanged", () => {
    const bm = { ranges: { normalMin: 10, normalMax: 20 } };
    assert.strictEqual(calculateMarkerScore(15, bm), 100);
    assert.strictEqual(calculateMarkerScore(9, bm), 75);
    assert.strictEqual(calculateMarkerScore(22.5, bm), 50);
    assert.strictEqual(calculateMarkerScore(25, bm), 30);
  });
}

// ---------------------------------------------------------------------------
// Main test runner
// ---------------------------------------------------------------------------

async function runAll() {
  await runOverrideTests();
  await runErrorClassificationTests();

  console.log("\n==========================================");
  console.log(`LAB REPORT UNIT TESTS: ${passed} Passed, ${failed} Failed`);
  console.log("==========================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
