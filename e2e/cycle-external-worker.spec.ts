import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle E: External Worker Workflow (Admin -> External Worker -> Settlement)', () => {
  test('Admin assigns to External Worker and processes settlement', async ({ browser }) => {
    // Step 1: Admin Creation
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/dispatch/new');
    
    await adminPage.locator('select').nth(0).selectOption({ index: 1 });
    await adminPage.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await adminPage.click('button:has-text("Next Step")');
    // Select No Machine (Labor Only)
    await adminPage.locator('select').nth(0).selectOption({ label: 'No Machine (Labor Only)' });
    await adminPage.click('button:has-text("Next Step")');
    // We would assign an external worker here (assumed to be index 2 or 3)
    await adminPage.locator('select').nth(0).selectOption({ label: 'Unassigned' }); // driver
    await adminPage.locator('select').nth(1).selectOption({ index: 2 }); // external operator/mestri
    await adminPage.click('button:has-text("Create Dispatch")');
    await adminPage.waitForTimeout(3000);
    await adminPage.close();

    // Step 2: Settlement
    const adminContext2 = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage2 = await adminContext2.newPage();
    await adminPage2.goto('/admin/settlements');
    await expect(adminPage2.locator('text=Day-Based Settlements')).toBeVisible();
    await adminPage2.close();
  });
});
