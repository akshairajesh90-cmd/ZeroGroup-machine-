const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';
  
  if (!fs.existsSync(artifactDir)){
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for IronRent Incident & Recovery Simulation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // 1. Authenticate as Owner
    console.log('Step 1: Logging in as Owner...');
    await page.goto('http://localhost:3001/');
    await page.fill('input[name="email"]', 'owner@ironrent.test');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*owner.*/, { timeout: 8000 }).catch(() => {});
    console.log('Login successful.');

    // 2. Capture Dispatch Board (Breakdown and Swap Button)
    console.log('Step 2: Navigating to Staff Dispatch Board...');
    await page.goto('http://localhost:3001/staff/dispatch');
    await page.waitForTimeout(3000);
    const dispatchImgPath = path.join(artifactDir, 'sim_dispatch_board.png');
    await page.screenshot({ path: dispatchImgPath, fullPage: true });
    console.log(`Saved screenshot to ${dispatchImgPath}`);

    // 3. Capture Cash & Receipts Discrepancy Badges
    console.log('Step 3: Navigating to Staff Cash Dashboard...');
    await page.goto('http://localhost:3001/staff/cash');
    await page.waitForTimeout(3000);
    const cashImgPath = path.join(artifactDir, 'sim_cash_discrepancies.png');
    await page.screenshot({ path: cashImgPath, fullPage: true });
    console.log(`Saved screenshot to ${cashImgPath}`);

    // 4. Capture Manual Adjustments Offset Button
    console.log('Step 4: Navigating to Owner Manual Adjustments...');
    await page.goto('http://localhost:3001/owner/adjustments');
    await page.waitForTimeout(3000);
    const adjustmentsImgPath = path.join(artifactDir, 'sim_adjustments_reversals.png');
    await page.screenshot({ path: adjustmentsImgPath, fullPage: true });
    console.log(`Saved screenshot to ${adjustmentsImgPath}`);

    // 5. Capture Trash & Recovery (Deleted Receipts)
    console.log('Step 5: Navigating to Owner Trash & Recovery...');
    await page.goto('http://localhost:3001/owner/trash');
    await page.waitForTimeout(3000);
    const trashImgPath = path.join(artifactDir, 'sim_trash_bin.png');
    await page.screenshot({ path: trashImgPath, fullPage: true });
    console.log(`Saved screenshot to ${trashImgPath}`);

    console.log('Simulation complete! All screenshots saved in artifact directory.');

  } catch (error) {
    console.error('Simulation failed with error:', error);
  } finally {
    await browser.close();
  }
})();
