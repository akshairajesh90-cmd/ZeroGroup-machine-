const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  
  // Use the admin storage state to bypass login
  const context = await browser.newContext({
    storageState: path.join(__dirname, 'playwright/.auth/admin.json')
  });

  const page = await context.newPage();
  
  // Go to Admin Dashboard
  await page.goto('http://localhost:3000/admin/dashboard');
  
  // Wait for the page to load
  await page.waitForTimeout(2000);
  
  // Take screenshot
  const screenshotPath = path.join('C:', 'Users', 'AKSHAI RAJESH', '.gemini', 'antigravity', 'brain', '10af0972-150d-4cf5-a224-7ee800e54946', 'chrome-screenshot.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log('Screenshot saved to ' + screenshotPath);
  
  await browser.close();
})();
