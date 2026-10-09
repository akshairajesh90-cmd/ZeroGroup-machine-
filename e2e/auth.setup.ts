import { test as setup, expect } from '@playwright/test';
import path from 'path';

// Define paths for storing authentication state
const adminFile = path.join(__dirname, '../playwright/.auth/admin.json');
const staffFile = path.join(__dirname, '../playwright/.auth/staff.json');
const driverFile = path.join(__dirname, '../playwright/.auth/driver.json');
const operatorFile = path.join(__dirname, '../playwright/.auth/operator.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="email"]', 'owner@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  // Wait until URL is no longer the root login page (handles /redirecting then /admin/dashboard)
  await page.waitForURL(
    (url) => url.pathname !== '/' && url.pathname !== '/redirecting',
    { timeout: 90000 }
  );
  await page.context().storageState({ path: adminFile });
});

setup('authenticate as staff', async ({ page }) => {
  await page.goto('/');
  await page.fill('input[name="email"]', 'staff@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname !== '/' && url.pathname !== '/redirecting',
    { timeout: 90000 }
  );
  await page.context().storageState({ path: staffFile });
});

setup('authenticate as driver', async ({ page }) => {
  await page.goto('/');
  // Switch to the Field / Driver App tab first
  await page.click('button:has-text("Field / Driver App")');
  await page.fill('input[name="email"]', 'driver@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname !== '/' && url.pathname !== '/redirecting',
    { timeout: 90000 }
  );
  await page.context().storageState({ path: driverFile });
});

setup('authenticate as operator', async ({ page }) => {
  await page.goto('/');
  // Switch to the Field / Driver App tab first
  await page.click('button:has-text("Field / Driver App")');
  await page.fill('input[name="email"]', 'operator@ironrent.test');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => url.pathname !== '/' && url.pathname !== '/redirecting',
    { timeout: 90000 }
  );
  await page.context().storageState({ path: operatorFile });
});
