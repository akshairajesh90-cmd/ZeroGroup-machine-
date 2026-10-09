const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();
  const outDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';

  try {
    // 1. Visit /staff/sub-leaders as OWNER
    console.log('Testing Staff Sub-Leaders...');
    fs.writeFileSync('mock-role.txt', 'OWNER');
    await page.goto('http://localhost:3000/staff/sub-leaders');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'sub_leaders_directory.png') });

    // 2. Add via UI
    await page.fill('input[name="name"]', 'Kaka (Mesthiri)');
    await page.fill('input[name="phone"]', '9876543210');
    await page.click('button:has-text("Add to Directory")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'sub_leaders_directory_populated.png') });
    console.log('Sub-Leaders screenshot saved.');

    // 3. Visit /operator/home as OPERATOR
    console.log('Testing Operator Home...');
    fs.writeFileSync('mock-role.txt', 'OPERATOR');
    await page.goto('http://localhost:3000/operator/home');
    await page.waitForTimeout(3000);
    // Open the dropdown
    await page.click('h3:has-text("Log External Helpers")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'operator_log_labor.png') });
    
    // Fill the form
    await page.selectOption('select[name="subLeaderId"]', { label: 'Kaka (Mesthiri)' });
    await page.fill('input[name="totalCashHandedOut"]', '1500');
    await page.fill('textarea[name="externalWorkerNames"]', 'Sadam, John');
    await page.click('button:has-text("Log Cash Handed Out")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'operator_log_labor_success.png') });
    console.log('Operator screenshot saved.');

    // 4. Visit /staff/dispatch as OWNER
    console.log('Testing Staff Dispatch Review...');
    fs.writeFileSync('mock-role.txt', 'OWNER');
    await page.goto('http://localhost:3000/staff/dispatch');
    await page.waitForTimeout(4000);
    
    // Click on the first dispatch to open details
    await page.evaluate(() => {
      const els = document.querySelectorAll('.cursor-pointer.bg-zinc-900, .bg-zinc-800.p-4');
      for (const el of Array.from(els)) {
        if(el.textContent.includes('Test Verification Site')) {
          el.click();
          break;
        }
      }
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outDir, 'staff_dispatch_review.png') });
    console.log('Staff Dispatch Review screenshot saved.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();

