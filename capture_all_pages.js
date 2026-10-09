const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\c3f0161b-a719-4ddf-9418-45b64e26ab0c\\all_pages_screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  const capturePages = async (role, email, password, viewport, pages) => {
    console.log(`\n--- Capturing pages for ${role} ---`);
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    
    // Login
    await page.goto('http://localhost:3000');
    if (role === 'DRIVER' || role === 'OPERATOR') {
      await page.click('button:has-text("Field / Driver App")');
    }
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    
    for (const p of pages) {
      console.log(`Visiting ${p.url}...`);
      await page.goto(`http://localhost:3000${p.url}`);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(outputDir, `${role}_${p.name}.png`) });
    }
    
    await context.close();
  };

  const desktop = { width: 1280, height: 800 };
  const mobile = { width: 390, height: 844 };

  const staffPages = [
    { url: '/staff/dashboard', name: '01_dashboard' },
    { url: '/staff/fleet', name: '02_fleet' },
    { url: '/staff/dispatch', name: '03_dispatch_list' },
    { url: '/staff/dispatch/new', name: '04_dispatch_new' },
    { url: '/staff/cash', name: '05_cash' },
    { url: '/staff/directory', name: '06_directory' },
    { url: '/staff/documents', name: '07_documents' },
    { url: '/staff/expenses', name: '08_expenses' },
    { url: '/staff/live', name: '09_live' },
    { url: '/staff/maintenance', name: '10_maintenance' },
    { url: '/staff/operators', name: '11_operators' },
    { url: '/staff/tools', name: '12_tools' },
  ];

  const ownerPages = [
    { url: '/owner/settlements', name: '01_dashboard' },
    { url: '/owner/adjustments', name: '02_adjustments' },
    { url: '/owner/advances', name: '03_advances' },
    { url: '/owner/allocation', name: '04_allocation' },
    { url: '/owner/billing', name: '05_billing' },
    { url: '/owner/employees', name: '06_employees' },
    { url: '/owner/settlements', name: '07_settlements' },
    { url: '/owner/staff-log', name: '08_staff_log' },
  ];

  const driverPages = [
    { url: '/driver/home', name: '01_home' },
    { url: '/driver/dispatches', name: '02_dispatches' },
    { url: '/driver/cash', name: '03_cash' },
    { url: '/driver/expenses', name: '04_expenses' },
    { url: '/driver/pay', name: '05_pay' },
    { url: '/driver/portal', name: '06_portal' },
  ];

  const operatorPages = [
    { url: '/operator/home', name: '01_home' },
    { url: '/operator/equipment', name: '02_equipment' },
    { url: '/operator/pay', name: '03_pay' },
    { url: '/operator/scanner', name: '04_scanner' },
  ];

  await capturePages('STAFF', 'staff@ironrent.test', 'password123', desktop, staffPages);
  await capturePages('OWNER', 'owner@ironrent.test', 'password123', desktop, ownerPages);
  await capturePages('DRIVER', 'driver1@ironrent.test', 'password123', mobile, driverPages);
  await capturePages('OPERATOR', 'op1@ironrent.test', 'password123', mobile, operatorPages);

  await browser.close();
  console.log("\nAll pages captured successfully!");
})();
