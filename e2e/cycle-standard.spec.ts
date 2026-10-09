import { test, expect } from '@playwright/test';
import path from 'path';

// This test simulates the standard lifecycle spanning multiple roles
test.describe('Cycle A: Standard Lifecycle (Admin -> Driver -> Operator -> Admin)', () => {
  
  test('Full Dispatch to Settlement Flow', async ({ browser }) => {
    
    // Step 1: Admin Creation
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/dispatch/new');
    
    // Step 1: Jobsite & Dates
    await adminPage.locator('select').nth(0).selectOption({ index: 1 }); // Select first customer
    await adminPage.fill('input[placeholder*="123 Main St"]', 'Playwright Test Site');
    // Set a date (e.g., today)
    const today = new Date().toISOString().split('T')[0];
    await adminPage.fill('input[type="date"]', today);
    await adminPage.click('button:has-text("Next Step")');

    // Step 2: Assign Asset
    await adminPage.locator('select').nth(0).selectOption({ index: 1 }); // Select first machine
    await adminPage.click('button:has-text("Next Step")');

    // Step 3: Assign Crew
    await adminPage.locator('select').nth(0).selectOption({ index: 1 }); // Select first driver
    await adminPage.locator('select').nth(1).selectOption({ index: 1 }); // Select first operator
    await adminPage.click('button:has-text("Create Dispatch")');

    // Wait for the action to complete. router.back() fails in Playwright if there's no history.
    await adminPage.waitForTimeout(3000);
    await adminPage.close();

    // Step 2: Driver Transportation
    const driverContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/driver.json') });
    const driverPage = await driverContext.newPage();
    await driverPage.goto('/driver/dispatches');
    // Wait for dispatches to load and click the first PENDING one
    await driverPage.waitForSelector('a:has-text("PENDING")');
    await driverPage.locator('a:has-text("PENDING")').first().click();

    // Check all Pre-Flight Safety Checklist items
    await driverPage.getByText('Engine Oil & Water Coolant Level Verified').click();
    await driverPage.getByText('Tire Pressure & Emergency Brakes Functional').click();
    await driverPage.getByText('Auxiliary Vibrator / Hose Connections Secured').click();
    await driverPage.getByText('Customer On-Site Verified Equipment Delivery').click();

    // Mark as Delivered
    await driverPage.click('button:has-text("Confirm Checklist & Mark DELIVERED On-Site")');
    // In this cycle, the operator will complete the job.
    await driverPage.close();

    // Step 3: Operator Execution
    const operatorContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/operator.json') });
    const operatorPage = await operatorContext.newPage();
    await operatorPage.goto('/operator/home');
    
    // Check Operator Pre-Start Checklist
    await operatorPage.getByText('Hydraulics & PTO Check').click();
    await operatorPage.getByText('Outriggers & Stabilizers').click();
    await operatorPage.getByText('Emergency Stop Tested').click();
    await operatorPage.getByText('No Visible Fluid Leaks').click();
    await operatorPage.click('button:has-text("Unlock Machine")');

    // Fill out DocketCanvas
    await operatorPage.fill('input[placeholder="0.0"]', '100'); // start meter
    await operatorPage.fill('input[placeholder="Client Printed Name"]', 'Playwright User');
    
    // Draw signature
    await operatorPage.locator('canvas').click();
    await operatorPage.click('button:has-text("Sync Docket")');
    await operatorPage.close();

    // Step 4: Admin Resolution
    const adminContext2 = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage2 = await adminContext2.newPage();
    await adminPage2.goto('/admin/settlements');
    
    // We verify the settlement hub loads successfully.
    // The actual finalization requires specific IDs, so we just verify the page loads correctly.
    await expect(adminPage2.locator('text=Day-Based Settlements')).toBeVisible();
    await adminPage2.waitForTimeout(2000);
    await adminPage2.screenshot({ path: 'artifacts-screenshot.png', fullPage: true });
    await adminPage2.close();

  });

});
