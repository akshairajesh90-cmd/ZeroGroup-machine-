import { test as setup, expect } from '@playwright/test';
import path from 'path';

// Define paths for storing authentication state
const adminFile = path.join(__dirname, '../playwright/.auth/admin.json');
const staffFile = path.join(__dirname, '../playwright/.auth/staff.json');
const driverFile = path.join(__dirname, '../playwright/.auth/driver.json');
const operatorFile = path.join(__dirname, '../playwright/.auth/operator.json');

setup('authenticate as admin', async ({ page }) => {
  setup.setTimeout(45000);
  await page.goto('/');
  await page.fill('input[name="email"]', 'admin@zerogroup.com');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/admin portal|dashboard/i).first()).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: adminFile });
});

setup('authenticate as staff', async ({ page }) => {
  setup.setTimeout(45000);
  await page.goto('/');
  await page.fill('input[name="email"]', 'staff@zerogroup.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/office staff|staff operations/i).first()).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: staffFile });
});

setup('authenticate as driver', async ({ page }) => {
  setup.setTimeout(45000);
  await page.goto('/');
  await page.fill('input[name="email"]', 'driver@zerogroup.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/good morning|good afternoon|good evening|driver/i).first()).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: driverFile });
});

setup('authenticate as operator', async ({ page }) => {
  setup.setTimeout(45000);
  await page.goto('/');
  await page.fill('input[name="email"]', 'operator@zerogroup.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.getByText(/operator portal|mixer operator/i).first()).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: operatorFile });
});
