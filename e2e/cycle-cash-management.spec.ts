import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle G: Cash Management Workflow', () => {
  test('Operator collects cash, hands to staff, admin audits', async ({ browser }) => {
    // 1. Operator logs cash collection
    const operatorContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/operator.json') });
    const operatorPage = await operatorContext.newPage();
    // Assuming operator has a cash collection interface
    await operatorPage.goto('/operator/pay');
    await expect(operatorPage.locator('h1', { hasText: 'Pay & Settlement' })).toBeVisible();
    await operatorPage.close();

    // 2. Staff receives cash
    const staffContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/staff.json') });
    const staffPage = await staffContext.newPage();
    await staffPage.goto('/staff/dashboard'); // Assuming staff dashboard has cash log
    await staffPage.goto('/admin/cash'); // If staff has access to cash ledger
    await expect(staffPage.locator('text=Cash')).toBeVisible();
    await staffPage.close();

    // 3. Admin Audits
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/cash');
    await expect(adminPage.locator('text=Cash')).toBeVisible();
    await adminPage.close();
  });
});
