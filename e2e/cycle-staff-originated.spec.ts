import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle C: Staff Originated Workflow (Staff -> Driver -> Operator -> Admin)', () => {
  test('Staff creates dispatch, driver and operator complete, admin settles', async ({ browser }) => {
    // Step 1: Staff Creation
    const staffContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/staff.json') });
    const staffPage = await staffContext.newPage();
    await staffPage.goto('/staff/dashboard');
    
    // Staff goes to new dispatch
    await staffPage.goto('/admin/dispatch/new'); // Staff can access this via middleware mapping
    
    await staffPage.locator('select').nth(0).selectOption({ index: 1 });
    await staffPage.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await staffPage.click('button:has-text("Next Step")');
    await staffPage.locator('select').nth(0).selectOption({ index: 1 });
    await staffPage.click('button:has-text("Next Step")');
    await staffPage.locator('select').nth(0).selectOption({ index: 1 }); // driver
    await staffPage.locator('select').nth(1).selectOption({ index: 1 }); // operator
    await staffPage.click('button:has-text("Create Dispatch")');
    await staffPage.waitForTimeout(3000);
    await staffPage.close();

    // Step 2: Driver Transportation
    const driverContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/driver.json') });
    const driverPage = await driverContext.newPage();
    await driverPage.goto('/driver/dispatches');
    await driverPage.waitForSelector('a:has-text("PENDING")');
    await driverPage.locator('a:has-text("PENDING")').first().click();

    await driverPage.getByText('Engine Oil & Water Coolant Level Verified').click();
    await driverPage.getByText('Tire Pressure & Emergency Brakes Functional').click();
    await driverPage.getByText('Auxiliary Vibrator / Hose Connections Secured').click();
    await driverPage.getByText('Customer On-Site Verified Equipment Delivery').click();

    await driverPage.click('button:has-text("Confirm Checklist & Mark DELIVERED On-Site")');
    await driverPage.close();

    // Step 3: Operator Execution
    const operatorContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/operator.json') });
    const operatorPage = await operatorContext.newPage();
    await operatorPage.goto('/operator/home');
    
    await operatorPage.getByText('Hydraulics & PTO Check').click();
    await operatorPage.getByText('Outriggers & Stabilizers').click();
    await operatorPage.getByText('Emergency Stop Tested').click();
    await operatorPage.getByText('No Visible Fluid Leaks').click();
    await operatorPage.click('button:has-text("Unlock Machine")');

    await operatorPage.fill('input[placeholder="0.0"]', '120'); 
    await operatorPage.fill('input[placeholder="Client Printed Name"]', 'Staff Test User');
    await operatorPage.locator('canvas').click();
    await operatorPage.click('button:has-text("Sync Docket")');
    await operatorPage.close();

    // Step 4: Admin Settlement
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/settlements');
    await expect(adminPage.locator('text=Day-Based Settlements')).toBeVisible();
    await adminPage.close();
  });
});
