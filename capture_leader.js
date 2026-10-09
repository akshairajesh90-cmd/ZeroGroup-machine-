const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\d644131b-594a-4bcb-92cc-32eb6905f4a5';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000');
  
  await page.fill('input[name="email"]', 'leader@company.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000); 

  console.log("Current URL after login:", page.url());
  
  if (!page.url().includes('operator')) {
     await page.goto('http://localhost:3000/operator/home');
  }

  // Wait for the actual dashboard UI to render (not the loading screen)
  console.log("Waiting for dashboard to render...");
  await page.waitForSelector('h1', { timeout: 45000 });
  await page.waitForTimeout(3000); // Extra wait for client-side DnD components to hydrate

  await page.screenshot({ path: path.join(outputDir, 'leader_dashboard.png'), fullPage: true });

  await browser.close();
  console.log("Screenshot captured successfully!");
})();
