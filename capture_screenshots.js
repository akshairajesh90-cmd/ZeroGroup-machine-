const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\c3f0161b-a719-4ddf-9418-45b64e26ab0c\\screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("Navigating to localhost:3002...");
  await page.goto('http://localhost:3002');
  await page.screenshot({ path: path.join(outputDir, '1_login.png') });

  console.log("Logging in as staff...");
  await page.fill('input[name="email"]', 'staff@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000); // let UI settle

  console.log("Current URL after login:", page.url());
  await page.screenshot({ path: path.join(outputDir, '1a_after_login.png') });

  if (!page.url().includes('staff')) {
    console.log("Did not reach staff dashboard, attempting manual navigation");
    await page.goto('http://localhost:3002/staff/dashboard');
  }

  await page.waitForTimeout(5000); // let UI settle
  console.log("Capturing Staff Dashboard...");
  await page.screenshot({ path: path.join(outputDir, '2_staff_dashboard.png') });

  console.log("Navigating to Fleet...");
  await page.goto('http://localhost:3002/staff/fleet');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '3_staff_fleet.png') });

  console.log("Navigating to Dispatch...");
  await page.goto('http://localhost:3002/staff/dispatch');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '4_staff_dispatch.png') });

  console.log("Navigating to Crew Directory...");
  await page.goto('http://localhost:3002/staff/directory');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, '5_staff_directory.png') });

  await browser.close();
  console.log("Screenshots captured successfully!");
})();
