const path = require('path');
const { BASE_URL, waitForElement, clickWhenReady, typeWhenReady, getText, By, until } = require('../helpers/driver');
const { ensureFixtures } = require('../helpers/pdfGenerator');

async function runReportAnalysisTests(driver) {
  const results = [];
  const { validPath, invalidPath } = await ensureFixtures();

  console.log('\n--- Running Report Analysis Tests ---');

  // TC-REP-01: Open page
  try {
    await driver.get(`${BASE_URL}/reports`);
    await driver.sleep(2000);
    const heading = await getText(driver, By.xpath("//h1[contains(text(),'Lab Report Analysis')]"));
    results.push({
      testId: 'TC-REP-01',
      module: 'Report Analysis',
      testCase: 'Open page',
      expected: 'Page heading "Lab Report Analysis" displays',
      actual: `Found heading: "${heading}"`,
      status: 'PASS'
    });
  } catch (err) {
    results.push({
      testId: 'TC-REP-01',
      module: 'Report Analysis',
      testCase: 'Open page',
      expected: 'Page heading "Lab Report Analysis" displays',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-REP-02: Upload valid report
  try {
    const fileInput = await driver.findElement(By.css('input[type="file"]'));
    await fileInput.sendKeys(validPath);

    await driver.sleep(4500);
    const reportCard = await waitForElement(driver, By.css('article[role="button"]'), 15000);
    const cardText = await reportCard.getText();

    results.push({
      testId: 'TC-REP-02',
      module: 'Report Analysis',
      testCase: 'Upload valid report',
      expected: 'Report uploaded and displayed in report history list',
      actual: `Report card created with text preview: "${cardText.slice(0, 60).replace(/\n/g, ' ')}..."`,
      status: 'PASS'
    });
  } catch (err) {
    results.push({
      testId: 'TC-REP-02',
      module: 'Report Analysis',
      testCase: 'Upload valid report',
      expected: 'Report uploaded and displayed in report history list',
      actual: `Error uploading valid report: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-REP-03: Normal/Low/High biomarker results
  // TC-REP-04: Individual biomarker score
  // TC-REP-05: Overall health score
  // TC-REP-06: Recommendations
  try {
    const reportCards = await driver.findElements(By.css('article[role="button"]'));
    if (reportCards.length > 0) {
      await reportCards[0].click();
      await driver.sleep(3000);

      const pageText = await driver.findElement(By.css('body')).getText();
      const hasNormal = pageText.includes('Normal');
      const hasLow = pageText.includes('Low');
      const hasHigh = pageText.includes('High');

      results.push({
        testId: 'TC-REP-03',
        module: 'Report Analysis',
        testCase: 'Normal/Low/High biomarker results',
        expected: 'Biomarker status tags (Normal/Low/High) rendered in details',
        actual: `Normal present: ${hasNormal}, Low present: ${hasLow}, High present: ${hasHigh}`,
        status: (hasNormal || hasLow || hasHigh) ? 'PASS' : 'FAIL'
      });

      // TC-REP-04: Individual biomarker score & values
      const hasHemoglobin = pageText.includes('Hemoglobin');
      const hasFBS = pageText.includes('Fasting Blood Sugar') || pageText.includes('FBS') || pageText.includes('Glucose');
      results.push({
        testId: 'TC-REP-04',
        module: 'Report Analysis',
        testCase: 'Individual biomarker score',
        expected: 'Extracted biomarkers and ranges rendered in table',
        actual: `Biomarker rows detected on detail page: ${hasHemoglobin || hasFBS}`,
        status: (hasHemoglobin || hasFBS) ? 'PASS' : 'FAIL'
      });

      // TC-REP-05: Overall health score
      const healthScoreEl = await waitForElement(driver, By.xpath("//p[contains(text(),'Health Score')]/following-sibling::p"), 5000);
      const scoreText = await healthScoreEl.getText();
      results.push({
        testId: 'TC-REP-05',
        module: 'Report Analysis',
        testCase: 'Overall health score',
        expected: 'Calculated Health Score (0-100) rendered',
        actual: `Health Score displayed: "${scoreText.trim()}"`,
        status: scoreText.length > 0 ? 'PASS' : 'FAIL'
      });

      // TC-REP-06: Recommendations
      const hasCareRecs = pageText.includes('Care Recommendations');
      const hasDailyPractices = pageText.includes('Daily Practices');
      results.push({
        testId: 'TC-REP-06',
        module: 'Report Analysis',
        testCase: 'Recommendations',
        expected: 'Care Recommendations and Daily Practices displayed',
        actual: `Care Recs present: ${hasCareRecs}, Daily Practices present: ${hasDailyPractices}`,
        status: (hasCareRecs && hasDailyPractices) ? 'PASS' : 'FAIL'
      });
    } else {
      results.push({ testId: 'TC-REP-03', module: 'Report Analysis', testCase: 'Normal/Low/High biomarker results', expected: 'Report card clicked', actual: 'No report cards found', status: 'FAIL' });
      results.push({ testId: 'TC-REP-04', module: 'Report Analysis', testCase: 'Individual biomarker score', expected: 'Biomarkers listed', actual: 'No report cards found', status: 'FAIL' });
      results.push({ testId: 'TC-REP-05', module: 'Report Analysis', testCase: 'Overall health score', expected: 'Health Score displayed', actual: 'No report cards found', status: 'FAIL' });
      results.push({ testId: 'TC-REP-06', module: 'Report Analysis', testCase: 'Recommendations', expected: 'Recommendations displayed', actual: 'No report cards found', status: 'FAIL' });
    }
  } catch (err) {
    results.push({ testId: 'TC-REP-03', module: 'Report Analysis', testCase: 'Normal/Low/High biomarker results', expected: 'Status tags', actual: err.message, status: 'FAIL' });
    results.push({ testId: 'TC-REP-04', module: 'Report Analysis', testCase: 'Individual biomarker score', expected: 'Biomarker table', actual: err.message, status: 'FAIL' });
    results.push({ testId: 'TC-REP-05', module: 'Report Analysis', testCase: 'Overall health score', expected: 'Score', actual: err.message, status: 'FAIL' });
    results.push({ testId: 'TC-REP-06', module: 'Report Analysis', testCase: 'Recommendations', expected: 'Recommendations', actual: err.message, status: 'FAIL' });
  }

  // TC-REP-07: Invalid/no-valid-biomarker report
  try {
    await driver.get(`${BASE_URL}/reports`);
    await driver.sleep(2000);

    const fileInput = await driver.findElement(By.css('input[type="file"]'));
    await fileInput.sendKeys(invalidPath);
    await driver.sleep(4000);

    const pageText = await driver.findElement(By.css('body')).getText();
    const hasErrorMsg = pageText.includes('No valid biomarkers were detected in this report') || pageText.includes('upload a valid laboratory report');
    results.push({
      testId: 'TC-REP-07',
      module: 'Report Analysis',
      testCase: 'Invalid/no-valid-biomarker report',
      expected: 'Validation alert displays "No valid biomarkers were detected in this report."',
      actual: hasErrorMsg ? 'Verified validation error message displayed on page after upload' : `Page content preview: "${pageText.slice(0, 100).replace(/\n/g, ' ')}..."`,
      status: hasErrorMsg ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    results.push({
      testId: 'TC-REP-07',
      module: 'Report Analysis',
      testCase: 'Invalid/no-valid-biomarker report',
      expected: 'Validation alert displayed',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  return results;
}

module.exports = { runReportAnalysisTests };
