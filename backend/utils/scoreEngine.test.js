// mood-backend/utils/scoreEngine.test.js

const assert = require("assert");
const {
  calculateMentalHealthScore,
  calculateMoodRecoveryScore,
  calculateMentalHealthTrend,
  WELLBEING_WEIGHTS,
  RECOVERY_WEIGHTS,
} = require("./scoreEngine");
const { buildMoodInsights } = require("./insightEngine");

console.log("==========================================");
console.log("RUNNING SCORING ENGINE & INSIGHT TESTS");
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

// Scenario A: Best Case
runTest("Scenario A: Best case should yield 10.0 score and 100 overall", () => {
  const entry = {
    mood: "great",
    sleepLevel: 10,
    energyLevel: 10,
    motivationLevel: 10,
    focusLevel: 10,
    socialInteraction: 10,
    anxietyLevel: 1,
    stressLevel: 1,
  };

  const score = calculateMentalHealthScore(entry);
  const recovery = calculateMoodRecoveryScore(entry);
  const trend = calculateMentalHealthTrend(entry);

  assert.strictEqual(score, 10.0, `Expected 10.0, got ${score}`);
  assert.strictEqual(recovery, 100.0, `Expected recovery 100.0, got ${recovery}`);
  assert.strictEqual(trend, 100.0, `Expected trend 100.0, got ${trend}`);
});

// Scenario B: Worst Case
runTest("Scenario B: Worst case should yield 0.0 score and 0 overall", () => {
  const entry = {
    mood: "terrible",
    sleepLevel: 1,
    energyLevel: 1,
    motivationLevel: 1,
    focusLevel: 1,
    socialInteraction: 1,
    anxietyLevel: 10,
    stressLevel: 10,
  };

  const score = calculateMentalHealthScore(entry);
  const recovery = calculateMoodRecoveryScore(entry);
  const trend = calculateMentalHealthTrend(entry);

  assert.strictEqual(score, 0.0, `Expected 0.0, got ${score}`);
  assert.strictEqual(recovery, 0.0, `Expected recovery 0.0, got ${recovery}`);
  assert.strictEqual(trend, 0.0, `Expected trend 0.0, got ${trend}`);
});

// Scenario C: Mid-range
runTest("Scenario C: Mid-range (okay + all 5) should yield score close to 5.0 (5.2)", () => {
  const entry = {
    mood: "okay",
    sleepLevel: 5,
    energyLevel: 5,
    motivationLevel: 5,
    focusLevel: 5,
    socialInteraction: 5,
    anxietyLevel: 5,
    stressLevel: 5,
  };

  const score = calculateMentalHealthScore(entry);
  const trend = calculateMentalHealthTrend(entry);

  assert.strictEqual(score, 5.2, `Expected 5.2, got ${score}`);
  assert.strictEqual(trend, 51.5, `Expected trend 51.5, got ${trend}`);
});

// Scenario D: High anxiety/stress but decent mood
runTest("Scenario D: High anxiety/stress but decent mood should produce reasonable score (~5.2)", () => {
  const entry = {
    mood: "good",
    sleepLevel: 7,
    energyLevel: 6,
    motivationLevel: 6,
    focusLevel: 6,
    socialInteraction: 5,
    anxietyLevel: 8,
    stressLevel: 8,
  };

  const score = calculateMentalHealthScore(entry);
  assert.strictEqual(score, 5.2, `Expected 5.2, got ${score}`);
});

// Scenario E: Missing numeric fields
runTest("Scenario E: Missing numeric fields (mood=good) should default to 5.5 neutral midpoint (~5.7)", () => {
  const entry = {
    mood: "good",
  };

  const score = calculateMentalHealthScore(entry);
  assert.strictEqual(score, 5.7, `Expected 5.7, got ${score}`);
});

// Extra Test: Boundary & Clamping
runTest("Boundary Values: Values > 10 or < 1 should clamp cleanly", () => {
  const entryHigh = {
    mood: "great",
    sleepLevel: 15,
    energyLevel: 12,
    motivationLevel: 11,
    focusLevel: 14,
    socialInteraction: 100,
    anxietyLevel: -5,
    stressLevel: 0,
  };
  const scoreHigh = calculateMentalHealthScore(entryHigh);
  assert.strictEqual(scoreHigh, 10.0, `Out of bounds high should clamp to 10.0, got ${scoreHigh}`);

  const entryLow = {
    mood: "terrible",
    sleepLevel: -3,
    energyLevel: 0,
    motivationLevel: -1,
    focusLevel: -5,
    socialInteraction: -10,
    anxietyLevel: 15,
    stressLevel: 20,
  };
  const scoreLow = calculateMentalHealthScore(entryLow);
  assert.strictEqual(scoreLow, 0.0, `Out of bounds low should clamp to 0.0, got ${scoreLow}`);
});

// Extra Test: Weight sums validation
runTest("Weight Consistency: WELLBEING_WEIGHTS and RECOVERY_WEIGHTS must sum to 1.00", () => {
  const wellbeingSum = Object.values(WELLBEING_WEIGHTS).reduce((a, b) => a + b, 0);
  const recoverySum = Object.values(RECOVERY_WEIGHTS).reduce((a, b) => a + b, 0);

  assert(Math.abs(wellbeingSum - 1.0) < 0.0001, `WELLBEING_WEIGHTS sum must be 1.0, got ${wellbeingSum}`);
  assert(Math.abs(recoverySum - 1.0) < 0.0001, `RECOVERY_WEIGHTS sum must be 1.0, got ${recoverySum}`);
});

// Extra Test: Insight Engine Consistency
runTest("Insight Engine Alignment: score * 10 should equal Insight overall score for same entry within rounding margin", () => {
  const entry = {
    createdAt: new Date().toISOString(),
    mood: "good",
    sleepLevel: 8,
    energyLevel: 7,
    motivationLevel: 7,
    focusLevel: 8,
    socialInteraction: 6,
    anxietyLevel: 3,
    stressLevel: 4,
  };

  const score = calculateMentalHealthScore(entry);
  const insights = buildMoodInsights([entry, entry]); // at least 2 entries for current week

  const insightOverall = insights.metrics.overall;
  const scoreScaled = score * 10;

  assert(
    Math.abs(scoreScaled - insightOverall) <= 0.3,
    `MentalHealthScore*10 (${scoreScaled}) must match Insight overall (${insightOverall}) within rounding margin`
  );
});

console.log("\n==========================================");
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("==========================================");

if (failed > 0) {
  process.exit(1);
}
