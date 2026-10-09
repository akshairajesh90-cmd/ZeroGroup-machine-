const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();
  const outDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';

  fs.writeFileSync('mock-role.txt', 'OPERATOR');
  await page.goto('http://localhost:3000/operator/home');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'operator_home_debug.png') });
  await browser.close();
})();
