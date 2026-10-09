const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1024 } });
  const page = await context.newPage();
  const outDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';

  try {
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
  } finally {
    await browser.close();
  }
})();
