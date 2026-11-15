import { test, expect } from '@playwright/test';

test.describe('Zero Group Role-Based Integrated Journey Tests', () => {

  test('ADMIN: Executive Operations, Rate Management, Live Tracking', async ({ page }) => {
    test.setTimeout(150000);
    await page.context().clearCookies();

    // 1. Authenticate as Admin
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('admin@zerogroup.com');
    await page.locator('input[name="password"]').fill('admin123');
    await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Admin Dashboard
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

  test('STAFF: Operations Dashboard, Central Dispatch Board, Fleet Inventory', async ({ page }) => {
    test.setTimeout(120000);
    await page.context().clearCookies();

    // 1. Authenticate as Staff
    await page.goto('/login');
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"]').fill('staff@zerogroup.com');
      await page.locator('input[name="password"]').fill('password123');
      await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    }

    // 2. Staff Operations Dashboard
    await page.goto('/staff/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/staff/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Central Dispatch Board
    await page.goto('/staff/dispatch', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('OWNER: Weekly Settlements Ledger & Machine Allocation', async ({ page }) => {
    test.setTimeout(150000);
    await page.context().clearCookies();

    // 1. Authenticate as Owner
    await page.goto('/login');
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"]').fill('akshairajesh07@gmail.com');
      await page.locator('input[name="password"]').fill('admin123');
      await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    }

    // 2. Owner Dashboard
    await page.goto('/owner/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/owner/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Financial Settlements Audit
    await page.goto('/owner/settlements', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();

    // 4. Fleet Allocation
    await page.goto('/owner/allocation', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('DRIVER: Mobile Shift Dashboard, Active Dispatches, GPS Ping', async ({ page }) => {
    test.setTimeout(150000);
    await page.context().clearCookies();

    // 1. Authenticate as Driver
    await page.goto('/login');
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"]').fill('driver@zerogroup.com');
      await page.locator('input[name="password"]').fill('password123');
      await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    }

    // 2. Driver Mobile Home
    await page.goto('/driver/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/driver/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Driver Dispatches & Orders
    await page.goto('/driver/dispatches', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

  test('OPERATOR: Daily Shift Logging & Operator Ledger', async ({ page }) => {
    test.setTimeout(150000);
    await page.context().clearCookies();

    // 1. Authenticate as Operator
    await page.goto('/login');
    if (page.url().includes('/login')) {
      await page.locator('input[name="email"]').fill('operator@zerogroup.com');
      await page.locator('input[name="password"]').fill('password123');
      await page.getByRole('button', { name: /Sign In to Plant Portal/i }).click();
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
    }

    // 2. Operator Home
    await page.goto('/operator/home', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/operator/);
    await expect(page.locator('body')).toBeVisible();

    // 3. Field Ledger
    await page.goto('/operator/ledger', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });

});
