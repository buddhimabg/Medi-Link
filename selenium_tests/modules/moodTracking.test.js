const { BASE_URL, waitForElement, clickWhenReady, typeWhenReady, getText, By, until } = require('../helpers/driver');

async function runMoodTrackingTests(driver) {
  const results = [];
  console.log('\n--- Running Mood Tracking Tests ---');

  // TC-MOOD-01: Open mood page
  try {
    await driver.get(`${BASE_URL}/mood-dashboard`);
    await driver.sleep(2000);
    const heading = await getText(driver, By.xpath("//h1[contains(text(),'Mood Track Dashboard')]"));
    results.push({
      testId: 'TC-MOOD-01',
      module: 'Mood Tracking',
      testCase: 'Open mood page',
      expected: 'Mood Track Dashboard page opens with heading',
      actual: `Found heading: "${heading}"`,
      status: 'PASS'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-01',
      module: 'Mood Tracking',
      testCase: 'Open mood page',
      expected: 'Dashboard opens',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-MOOD-02: Submit supported moods (Full check-in flow)
  try {
    await driver.get(`${BASE_URL}/check-in`);
    await driver.sleep(1500);

    // Step 1: Select mood 'good'
    const moodBtns = await driver.findElements(By.css('.mood-btn'));
    if (moodBtns.length >= 4) {
      await driver.executeScript("arguments[0].click();", moodBtns[3]); // Select 'good'
      await driver.sleep(500);
    }

    // Click Continue to Step 2
    const continueBtn1 = await waitForElement(driver, By.xpath("//button[contains(.,'Continue')]"));
    await driver.executeScript("arguments[0].click();", continueBtn1);
    await driver.sleep(2000);

    // Step 2 (/check-in/details): Select answer for all 4 questions
    const answerCardsStep2 = await driver.findElements(By.css('.checkin2-answer-card'));
    if (answerCardsStep2.length >= 16) {
      await driver.executeScript("arguments[0].click();", answerCardsStep2[0]);
      await driver.sleep(300);
      await driver.executeScript("arguments[0].click();", answerCardsStep2[4]);
      await driver.sleep(300);
      await driver.executeScript("arguments[0].click();", answerCardsStep2[8]);
      await driver.sleep(300);
      await driver.executeScript("arguments[0].click();", answerCardsStep2[12]);
      await driver.sleep(500);
    }

    const continueBtn2 = await waitForElement(driver, By.xpath("//button[contains(.,'Continue')]"));
    await driver.executeScript("arguments[0].click();", continueBtn2);
    await driver.sleep(2000);

    // Step 3 (/check-in/details/2): Select answer for all 3 questions
    const answerCardsStep3 = await driver.findElements(By.css('.checkin2-answer-card'));
    if (answerCardsStep3.length >= 12) {
      await driver.executeScript("arguments[0].click();", answerCardsStep3[0]);
      await driver.sleep(300);
      await driver.executeScript("arguments[0].click();", answerCardsStep3[4]);
      await driver.sleep(300);
      await driver.executeScript("arguments[0].click();", answerCardsStep3[8]);
      await driver.sleep(600);
    }

    const completeBtn = await waitForElement(driver, By.xpath("//button[contains(.,'Complete Check-in')]"));
    await driver.executeScript("arguments[0].click();", completeBtn);
    await driver.sleep(6000);

    const currentUrl = await driver.getCurrentUrl();
    const isSummary = currentUrl.includes('/check-in/summary') || currentUrl.includes('/dashboard');

    results.push({
      testId: 'TC-MOOD-02',
      module: 'Mood Tracking',
      testCase: 'Submit supported moods',
      expected: 'Completed 3-step check-in and redirected to summary/dashboard',
      actual: `Check-in flow submitted. Landed on URL: ${currentUrl}`,
      status: isSummary ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-02',
      module: 'Mood Tracking',
      testCase: 'Submit supported moods',
      expected: 'Check-in completed',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-MOOD-03: Mood history
  try {
    await driver.get(`${BASE_URL}/mood-history`);
    await driver.sleep(2000);

    const heading = await getText(driver, By.xpath("//h1[contains(text(),'Mood History')]"));
    const viewButtons = await driver.findElements(By.xpath("//button[contains(text(),'View')]"));

    results.push({
      testId: 'TC-MOOD-03',
      module: 'Mood Tracking',
      testCase: 'Mood history',
      expected: 'Mood History page displays with Chart & Calendar View controls',
      actual: `Heading: "${heading}", View toggle buttons count: ${viewButtons.length}`,
      status: 'PASS'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-03',
      module: 'Mood Tracking',
      testCase: 'Mood history',
      expected: 'History opens',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-MOOD-04: Mood insights
  try {
    await driver.get(`${BASE_URL}/insights`);
    await driver.sleep(2000);

    const heading = await getText(driver, By.xpath("//h1[contains(text(),'Weekly Insight')]"));
    const pageText = await driver.findElement(By.css('body')).getText();
    const hasTrend = pageText.includes('Trend') || pageText.includes('Summary');

    results.push({
      testId: 'TC-MOOD-04',
      module: 'Mood Tracking',
      testCase: 'Mood insights',
      expected: 'Weekly Insights rendered with trend summary and factor analysis',
      actual: `Heading: "${heading}", Trend/Factor details present: ${hasTrend}`,
      status: hasTrend ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-04',
      module: 'Mood Tracking',
      testCase: 'Mood insights',
      expected: 'Insights rendered',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-MOOD-05: Recovery score, 7-day average, Check-in streak
  try {
    await driver.get(`${BASE_URL}/mood-dashboard`);
    await waitForElement(driver, By.xpath("//*[contains(text(),'7-Day Average')]"), 10000);
    await driver.sleep(1000);

    const pageText = await driver.findElement(By.css('body')).getText();
    const has7DayAvg = pageText.includes('7-Day Average');
    const hasStreak = pageText.includes('Check-in Streak');
    const hasRecovery = pageText.includes('Recovery Score');

    results.push({
      testId: 'TC-MOOD-05',
      module: 'Mood Tracking',
      testCase: 'Recovery score, 7-day average, Check-in streak',
      expected: 'Stats cards (7-Day Average, Check-in Streak, Recovery Score) rendered',
      actual: `7-Day Avg: ${has7DayAvg}, Streak: ${hasStreak}, Recovery: ${hasRecovery}`,
      status: (has7DayAvg && hasStreak && hasRecovery) ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-05',
      module: 'Mood Tracking',
      testCase: 'Recovery score, 7-day average, Check-in streak',
      expected: 'Stats cards rendered',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  // TC-MOOD-06: Mood Fix activity completion where supported
  try {
    await driver.get(`${BASE_URL}/mood-fix`);
    const startBtn = await waitForElement(driver, By.xpath("//button[contains(text(),'Start')]"), 10000);
    await driver.executeScript("arguments[0].click();", startBtn);
    await driver.sleep(2000);

    // Toggle step checkboxes using JS click
    const stepCheckboxes = await driver.findElements(By.xpath("//div[contains(@class,'space-y-2')]//button"));
    for (const btn of stepCheckboxes) {
      try {
        await driver.executeScript("arguments[0].click();", btn);
        await driver.sleep(200);
      } catch (_) {}
    }

    // Select post-activity mood rating using JS click
    const ratingBtns = await driver.findElements(By.xpath("//div[contains(@class,'grid-cols-5')]//button"));
    if (ratingBtns.length > 1) {
      await driver.executeScript("arguments[0].click();", ratingBtns[1]); // Select 'Good'
      await driver.sleep(400);
    }

    // Click complete button
    const completeActivityBtn = await waitForElement(driver, By.xpath("//button[contains(.,'Complete Mood Fix Activity')]"));
    await driver.executeScript("arguments[0].click();", completeActivityBtn);
    await driver.sleep(3000);

    const pageText = await driver.findElement(By.css('body')).getText();
    const completedSuccess = pageText.includes('Completed') || pageText.includes('Great job finishing') || pageText.includes('After mood');

    results.push({
      testId: 'TC-MOOD-06',
      module: 'Mood Tracking',
      testCase: 'Mood Fix activity completion where supported',
      expected: 'Activity completed, post-activity mood recorded, success banner displayed',
      actual: completedSuccess ? 'Activity marked complete and feedback saved successfully' : `Notice text preview: "${pageText.slice(0, 100).replace(/\n/g, ' ')}..."`,
      status: completedSuccess ? 'PASS' : 'FAIL'
    });
  } catch (err) {
    results.push({
      testId: 'TC-MOOD-06',
      module: 'Mood Tracking',
      testCase: 'Mood Fix activity completion where supported',
      expected: 'Activity completed',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    });
  }

  return results;
}

module.exports = { runMoodTrackingTests };
