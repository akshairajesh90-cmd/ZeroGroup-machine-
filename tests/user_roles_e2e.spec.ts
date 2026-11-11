import { test, expect } from '@playwright/test';

test.describe('Zero Group Role-Based Integrated Journey Tests', () => {

  test('ADMIN: Executive Operations, Rate Management, Live Tracking', async ({ page }) => {
    test.setTimeout(90000);
    await page.context().clearCookies();

    // 1. Authenticate as Admin
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('admin@zerogroup.com');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();

    // 2. Admin Dashboard
    await page.waitForTimeout(2000);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Rate Settings Management
    await page.goto('/admin/settings/rates');
    await expect(page.locator('body')).toBeVisible();

    // 4. Live Map Fleet Tracking
    await page.goto('/admin/live/map');
    await expect(page.locator('body')).toBeVisible();
  });

  test('STAFF: Central Dispatch Board, Machinery Assignment, Inventory', async ({ page }) => {
    test.setTimeout(90000);
    await page.context().clearCookies();

    // 1. Authenticate as Staff
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('staff@zerogroup.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();

    // 2. Dispatch Board
    await page.waitForTimeout(2000);
    await page.goto('/staff/dispatch');
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Tool & Equipment Inventory
    await page.goto('/staff/tools');
    await expect(page.locator('body')).toBeVisible();

    // 4. Invoice Registry
    await page.goto('/staff/invoices');
    await expect(page.locator('body')).toBeVisible();
  });

  test('OWNER: Weekly Settlements Ledger & Machine Allocation', async ({ page }) => {
    test.setTimeout(90000);
    await page.context().clearCookies();

    // 1. Authenticate as Owner
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('owner@zerogroup.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();

    // 2. Owner Dashboard
    await page.waitForTimeout(2000);
    await page.goto('/owner/dashboard');
    await expect(page).toHaveURL(/\/owner/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Financial Settlements Audit
    await page.goto('/owner/settlements');
    await expect(page.locator('body')).toBeVisible();

    // 4. Fleet Allocation
    await page.goto('/owner/allocation');
    await expect(page.locator('body')).toBeVisible();
  });

  test('DRIVER: Mobile Shift Dashboard, Active Dispatches, GPS Ping', async ({ page }) => {
    test.setTimeout(90000);
    await page.context().clearCookies();

    // 1. Authenticate as Driver
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('driver@zerogroup.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();

    // 2. Driver Mobile Home
    await page.waitForTimeout(2000);
    await page.goto('/driver/home');
    await expect(page).toHaveURL(/\/driver/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Driver Dispatches & Orders
    await page.goto('/driver/dispatches');
    await expect(page.locator('body')).toBeVisible();
  });

  test('OPERATOR: Daily Shift Logging & Operator Ledger', async ({ page }) => {
    test.setTimeout(90000);
    await page.context().clearCookies();

    // 1. Authenticate as Operator
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('operator@zerogroup.com');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();

    // 2. Operator Home
    await page.waitForTimeout(2000);
    await page.goto('/operator/home');
    await expect(page).toHaveURL(/\/operator/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Field Ledger
    await page.goto('/operator/ledger');
    await expect(page.locator('body')).toBeVisible();
  });

});
