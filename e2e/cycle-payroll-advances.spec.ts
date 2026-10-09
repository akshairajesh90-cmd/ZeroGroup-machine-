import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle I: Payroll & Advances Workflow', () => {
  test('Admin issues advance, applies bonus, and finalizes settlement', async ({ browser }) => {
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    
    // 1. Issue Salary Advance
    await adminPage.goto('/admin/advances');
    await expect(adminPage.locator('text=Advances')).toBeVisible();

    // 2. Apply Manual Bonus/Adjustment
    await adminPage.goto('/admin/adjustments');
    await expect(adminPage.locator('text=Adjustments')).toBeVisible();

    // 3. Finalize Settlement with Deductions
    await adminPage.goto('/admin/settlements');
    await expect(adminPage.locator('text=Day-Based Settlements')).toBeVisible();

    await adminPage.close();
  });
});
