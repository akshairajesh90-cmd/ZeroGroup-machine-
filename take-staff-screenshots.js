const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';
  if (!fs.existsSync(artifactDir)){
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('--- STARTING STAFF PORTAL SCREENSHOT COLLECTION ---');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // Log in
    console.log('Logging in as Staff...');
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', 'staff@ironrent.test');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);

    // List of pages to capture
    const pages = [
      { url: 'http://localhost:3000/staff/dashboard', file: 'staff_page_1_dashboard.png' },
      { url: 'http://localhost:3000/staff/dispatch', file: 'staff_page_2_dispatch.png' },
      { url: 'http://localhost:3000/staff/cash', file: 'staff_page_3_cash.png' },
      { url: 'http://localhost:3000/staff/orders', file: 'staff_page_4_orders.png' },
      { url: 'http://localhost:3000/staff/fleet', file: 'staff_page_5_fleet.png' },
      { url: 'http://localhost:3000/staff/maintenance', file: 'staff_page_6_maintenance.png' },
      { url: 'http://localhost:3000/staff/expenses', file: 'staff_page_7_expenses.png' },
      { url: 'http://localhost:3000/staff/reconciliation', file: 'staff_page_8_reconciliation.png' },
      { url: 'http://localhost:3000/staff/live', file: 'staff_page_9_live.png' },
      { url: 'http://localhost:3000/staff/tools', file: 'staff_page_10_tools.png' },
      { url: 'http://localhost:3000/staff/projects', file: 'staff_page_11_projects.png' }
    ];

    for (const p of pages) {
      console.log(`Navigating to ${p.url}...`);
      await page.goto(p.url);
      await page.waitForTimeout(5000); // Wait for page compiling / data loading
      const dest = path.join(artifactDir, p.file);
      await page.screenshot({ path: dest, fullPage: true });
      console.log(`Captured and saved: ${p.file}`);
    }

    console.log('--- ALL SCREENSHOTS SAVED SUCCESSFULLY ---');
  } catch (error) {
    console.error('Screenshot collection failed:', error);
  } finally {
    await browser.close();
  }
})();
