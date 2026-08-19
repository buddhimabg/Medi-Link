const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const DEFAULT_TIMEOUT = 12000;

async function createDriver(options = {}) {
  const chromeOptions = new chrome.Options();
  
  if (options.headless !== false) {
    chromeOptions.addArguments('--headless=new');
  }
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');
  chromeOptions.addArguments('--disable-gpu');
  chromeOptions.addArguments('--window-size=1280,900');
  chromeOptions.addArguments('--allow-insecure-localhost');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(chromeOptions)
    .build();

  await driver.manage().setTimeouts({ implicit: 2000, pageLoad: 60000, script: 30000 });
  return driver;
}

async function waitForElement(driver, locator, timeout = DEFAULT_TIMEOUT) {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

async function clickWhenReady(driver, locator, timeout = DEFAULT_TIMEOUT) {
  const el = await waitForElement(driver, locator, timeout);
  await driver.wait(until.elementIsEnabled(el), timeout);
  await el.click();
  return el;
}

async function typeWhenReady(driver, locator, text, timeout = DEFAULT_TIMEOUT) {
  const el = await waitForElement(driver, locator, timeout);
  await el.clear();
  await el.sendKeys(text);
  return el;
}

async function getText(driver, locator, timeout = DEFAULT_TIMEOUT) {
  const el = await waitForElement(driver, locator, timeout);
  return await el.getText();
}

module.exports = {
  BASE_URL,
  createDriver,
  waitForElement,
  clickWhenReady,
  typeWhenReady,
  getText,
  By,
  until
};
