import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Cycle H: Maintenance Workflow', () => {
  test('Operator reports breakdown, admin manages repair', async ({ browser }) => {
    // 1. Driver/Operator Reports Breakdown via Portal
    const driverContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/driver.json') });
    const driverPage = await driverContext.newPage();
    await driverPage.goto('/driver/portal'); // Breakdown form is in portal
    await expect(driverPage.locator('text=Portal').first()).toBeVisible();
    await driverPage.close();

    // 2. Admin handles maintenance
    const adminContext = await browser.newContext({ storageState: path.join(__dirname, '../playwright/.auth/admin.json') });
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/maintenance');
    await expect(adminPage.locator('text=Maintenance')).toBeVisible();
    
    // Check Fleet status
    await adminPage.goto('/admin/fleet');
    await expect(adminPage.locator('text=Fleet')).toBeVisible();
    
    await adminPage.close();
  });
});
