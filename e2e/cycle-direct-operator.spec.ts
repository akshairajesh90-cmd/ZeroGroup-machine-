import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle B: Direct Operator Workflow (Admin -> Operator -> Admin)', () => {
  test('Full Independent Operator Flow', async ({ browser }) => {
    // Step 1: Admin Creation (Operator only)
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/dispatch/new');
    await adminPage.locator('select').nth(0).selectOption({ index: 1 });
    await adminPage.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await adminPage.click('button:has-text("Next Step")');
    // Machine
    await adminPage.locator('select').nth(0).selectOption({ index: 1 });
    await adminPage.click('button:has-text("Next Step")');
    // Unassigned Driver, Only Operator
    await adminPage.locator('select').nth(0).selectOption({ label: 'Unassigned' }); // No driver
    await adminPage.locator('select').nth(1).selectOption({ index: 1 }); // Assign operator
    await adminPage.click('button:has-text("Create Dispatch")');
    await adminPage.waitForTimeout(3000);
    await adminPage.close();

    // Step 2: Operator Direct Execution
    const operatorContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/operator.json') });
    const operatorPage = await operatorContext.newPage();
    await operatorPage.goto('/operator/home');
    await operatorPage.getByText('Hydraulics & PTO Check').click();
    await operatorPage.getByText('Outriggers & Stabilizers').click();
    await operatorPage.getByText('Emergency Stop Tested').click();
    await operatorPage.getByText('No Visible Fluid Leaks').click();
    await operatorPage.click('button:has-text("Unlock Machine")');
    await operatorPage.locator('canvas').click();
    await operatorPage.click('button:has-text("Sync Docket")');
    await operatorPage.close();

    // Step 3: Admin Settlement
    const adminContext2 = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage2 = await adminContext2.newPage();
    await adminPage2.goto('/admin/settlements');
    await expect(adminPage2.locator('text=Day-Based Settlements')).toBeVisible();
    await adminPage2.close();
  });
});
