const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\ef73f26c-806c-4e10-b072-ff41e678d18f';
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Testing Owner Settlements...');
  await page.goto('http://localhost:3001/');
  await page.fill('input[name="email"]', 'owner@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*owner.*/, { timeout: 5000 }).catch(() => {});
  
  await page.goto('http://localhost:3001/owner/settlements');
  await page.waitForTimeout(2000); // let it load
  await page.screenshot({ path: path.join(artifactDir, 'screenshot-owner-settlements.png'), fullPage: true });

  console.log('Testing Operator Home...');
  await context.clearCookies();
  await page.goto('http://localhost:3001/');
  await page.click('button:has-text("Field / Driver App")');
  await page.fill('input[name="email"]', 'op1@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*operator.*/, { timeout: 5000 }).catch(() => {});
  
  await page.goto('http://localhost:3001/operator/home');
  await page.waitForTimeout(2000); // let it load
  await page.screenshot({ path: path.join(artifactDir, 'screenshot-operator-home.png'), fullPage: true });

  console.log('Done!');
  await browser.close();
})();
