const { createDriver } = require('./helpers/driver');
const { runReportAnalysisTests } = require('./modules/reportAnalysis.test');
const { runRemindersTests } = require('./modules/reminders.test');
const { runMoodTrackingTests } = require('./modules/moodTracking.test');

async function main() {
  console.log('====================================================');
  console.log(' STARTING SELENIUM WEBDRIVER UI TEST SUITE FOR MEDI-LINK');
  console.log('====================================================');

  const driver = await createDriver({ headless: true });
  const allResults = [];

  try {
    const reportResults = await runReportAnalysisTests(driver);
    allResults.push(...reportResults);

    const reminderResults = await runRemindersTests(driver);
    allResults.push(...reminderResults);

    const moodResults = await runMoodTrackingTests(driver);
    allResults.push(...moodResults);
  } catch (globalErr) {
    console.error('Global test execution error:', globalErr);
  } finally {
    await driver.quit();
  }

  console.log('\n====================================================');
  console.log(' TEST RESULTS SUMMARY');
  console.log('====================================================\n');

  console.log('| Test ID | Module | Test Case | Expected Result | Actual Result | PASS/FAIL |');
  console.log('|---|---|---|---|---|---|');

  let passedCount = 0;
  let failedCount = 0;

  for (const res of allResults) {
    const statusFormatted = res.status === 'PASS' ? '**PASS**' : '**FAIL**';
    if (res.status === 'PASS') passedCount++;
    else failedCount++;

    console.log(`| ${res.testId} | ${res.module} | ${res.testCase} | ${res.expected} | ${res.actual} | ${statusFormatted} |`);
  }

  console.log(`\nTotal Executed: ${allResults.length} | Passed: ${passedCount} | Failed: ${failedCount}\n`);
}

main();
