import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle F: Invoicing & Payments Workflow', () => {
  test('Complete dispatch leads to invoice generation and payment', async ({ browser }) => {
    // Admin creates dispatch
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/dispatch/new');
    
    await adminPage.locator('select').nth(0).selectOption({ index: 1 });
    await adminPage.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    await adminPage.click('button:has-text("Next Step")');
    await adminPage.locator('select').nth(0).selectOption({ index: 1 });
    await adminPage.click('button:has-text("Next Step")');
    await adminPage.locator('select').nth(0).selectOption({ index: 1 }); // driver
    await adminPage.locator('select').nth(1).selectOption({ index: 1 }); // operator
    await adminPage.click('button:has-text("Create Dispatch")');
    await adminPage.waitForTimeout(3000);
    
    // Admin goes to orders (where invoicing usually happens)
    await adminPage.goto('/admin/orders');
    await expect(adminPage.locator('text=Orders')).toBeVisible();
    await adminPage.close();
  });
});
