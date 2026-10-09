const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const outputDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\c3f0161b-a719-4ddf-9418-45b64e26ab0c\\chain_screenshots';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  
  // Step A: STAFF OPERATIONS
  console.log("1. Logging in as STAFF...");
  const staffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const staffPage = await staffContext.newPage();
  await staffPage.goto('http://localhost:3000');
  
  // Login
  await staffPage.fill('input[name="email"]', 'staff@ironrent.test');
  await staffPage.fill('input[name="password"]', 'password123');
  await staffPage.click('button[type="submit"]');
  await staffPage.waitForTimeout(4000);
  await staffPage.screenshot({ path: path.join(outputDir, '01_staff_dashboard.png') });

  // Fleet / Ledger
  console.log("2. Staff Fleet / Asset Management...");
  await staffPage.goto('http://localhost:3000/staff/fleet');
  await staffPage.waitForTimeout(2000);
  await staffPage.screenshot({ path: path.join(outputDir, '02_staff_fleet_ledger.png') });

  // New Dispatch
  console.log("3. Navigating to New Dispatch...");
  await staffPage.goto('http://localhost:3000/staff/dispatch/new');
  await staffPage.waitForTimeout(2000);
  
  await staffPage.locator('select').nth(0).selectOption({ index: 1 }); // Select customer
  await staffPage.fill('input[placeholder*="123 Main St"]', 'Visual Chain Test Site');
  const today = new Date().toISOString().split('T')[0];
  await staffPage.fill('input[type="date"]', today);
  await staffPage.screenshot({ path: path.join(outputDir, '03_staff_jobsite.png') });
  await staffPage.click('button:has-text("Next Step")');
  await staffPage.waitForTimeout(1000);

  await staffPage.locator('select').nth(0).selectOption({ index: 1 }); // Select machine
  await staffPage.screenshot({ path: path.join(outputDir, '04_staff_asset.png') });
  await staffPage.click('button:has-text("Next Step")');
  await staffPage.waitForTimeout(1000);

  await staffPage.locator('select').nth(0).selectOption({ index: 1 }); // Select driver
  await staffPage.locator('input[type="checkbox"]').first().check(); // Select first operator
  await staffPage.screenshot({ path: path.join(outputDir, '05_staff_crew.png') });
  
  await staffPage.click('button:has-text("Create Dispatch")');
  await staffPage.waitForTimeout(4000);
  await staffPage.screenshot({ path: path.join(outputDir, '06_staff_dispatch_list.png') });
  await staffContext.close();


  // Step B: DRIVER OPERATIONS
  console.log("4. Logging in as DRIVER...");
  const driverContext = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' });
  const driverPage = await driverContext.newPage();
  await driverPage.goto('http://localhost:3000');
  
  await driverPage.click('button:has-text("Field / Driver App")');
  await driverPage.fill('input[name="email"]', 'driver1@ironrent.test');
  await driverPage.fill('input[name="password"]', 'password123');
  await driverPage.click('button[type="submit"]');
  await driverPage.waitForTimeout(4000);
  await driverPage.screenshot({ path: path.join(outputDir, '07_driver_home.png') });

  console.log("5. Viewing Driver Dispatches...");
  await driverPage.goto('http://localhost:3000/driver/dispatches');
  await driverPage.waitForTimeout(2000);
  await driverPage.screenshot({ path: path.join(outputDir, '08_driver_dispatches.png') });

  const pendingCount = await driverPage.locator('a:has-text("PENDING")').count();
  if (pendingCount > 0) {
    await driverPage.locator('a:has-text("PENDING")').first().click();
    await driverPage.waitForTimeout(3000);
    await driverPage.screenshot({ path: path.join(outputDir, '09_driver_checklist.png') });

    const checks = ['Engine Oil & Water Coolant Level Verified', 'Tire Pressure & Emergency Brakes Functional', 'Auxiliary Vibrator / Hose Connections Secured', 'Customer On-Site Verified Equipment Delivery'];
    for(const check of checks) {
       const count = await driverPage.getByText(check).count();
       if(count > 0) await driverPage.getByText(check).click();
    }
    await driverPage.screenshot({ path: path.join(outputDir, '10_driver_checklist_done.png') });

    const completeBtn = await driverPage.locator('button:has-text("Confirm Checklist & Mark DELIVERED On-Site")').count();
    if(completeBtn > 0) {
       await driverPage.click('button:has-text("Confirm Checklist & Mark DELIVERED On-Site")');
       await driverPage.waitForTimeout(3000);
       await driverPage.screenshot({ path: path.join(outputDir, '11_driver_delivered.png') });
    }
  }
  await driverContext.close();

  // Step C: OPERATOR OPERATIONS
  console.log("6. Logging in as OPERATOR...");
  const opContext = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' });
  const opPage = await opContext.newPage();
  await opPage.goto('http://localhost:3000');
  
  await opPage.click('button:has-text("Field / Driver App")');
  await opPage.fill('input[name="email"]', 'op1@ironrent.test');
  await opPage.fill('input[name="password"]', 'password123');
  await opPage.click('button[type="submit"]');
  await opPage.waitForTimeout(4000);
  await opPage.screenshot({ path: path.join(outputDir, '12_op_home.png') });
  
  const hydraulicsCount = await opPage.getByText('Hydraulics & PTO Check').count();
  if (hydraulicsCount > 0) {
    console.log("7. Operator Pre-Start...");
    await opPage.getByText('Hydraulics & PTO Check').click();
    await opPage.getByText('Outriggers & Stabilizers').click();
    await opPage.getByText('Emergency Stop Tested').click();
    await opPage.getByText('No Visible Fluid Leaks').click();
    await opPage.screenshot({ path: path.join(outputDir, '13_op_checklist.png') });
    
    await opPage.click('button:has-text("Unlock Machine")');
    await opPage.waitForTimeout(3000);
    await opPage.screenshot({ path: path.join(outputDir, '14_op_unlocked.png') });
    
    console.log("8. Operator Docket...");
    await opPage.fill('input[placeholder="0.0"]', '100');
    await opPage.fill('input[placeholder="Client Printed Name"]', 'Visual Chain Client');
    await opPage.locator('canvas').click(); // draw sign
    await opPage.screenshot({ path: path.join(outputDir, '15_op_docket.png') });
    
    await opPage.click('button:has-text("Sync Docket")');
    await opPage.waitForTimeout(3000);
    await opPage.screenshot({ path: path.join(outputDir, '16_op_docket_synced.png') });
  } else {
    // Maybe independent crew
    const printInput = await opPage.locator('input[placeholder="Client Printed Name"]').count();
    if(printInput > 0) {
       await opPage.fill('input[placeholder="0.0"]', '8');
       await opPage.fill('input[placeholder="Client Printed Name"]', 'Visual Chain Client');
       await opPage.locator('canvas').click(); // draw sign
       await opPage.screenshot({ path: path.join(outputDir, '15_op_docket.png') });
       await opPage.click('button:has-text("Sync Docket")');
       await opPage.waitForTimeout(3000);
       await opPage.screenshot({ path: path.join(outputDir, '16_op_docket_synced.png') });
    }
  }
  await opContext.close();

  // Step D: OWNER OPERATIONS
  console.log("9. Logging in as OWNER...");
  const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto('http://localhost:3000');
  
  await ownerPage.fill('input[name="email"]', 'owner@ironrent.test');
  await ownerPage.fill('input[name="password"]', 'password123');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForTimeout(4000);
  await ownerPage.screenshot({ path: path.join(outputDir, '17_owner_dashboard.png') });

  console.log("10. Navigating to Owner Settlements...");
  await ownerPage.goto('http://localhost:3000/owner/settlements');
  await ownerPage.waitForTimeout(2000);
  await ownerPage.screenshot({ path: path.join(outputDir, '18_owner_settlements.png') });
  
  await ownerContext.close();

  await browser.close();
  console.log("Chain operation completed! Screenshots saved.");
})();
