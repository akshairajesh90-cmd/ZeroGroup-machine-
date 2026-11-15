import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const PROOF_DIR = path.join(process.cwd(), 'proof-screenshots');
const ARTIFACT_PROOF_DIR = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\6401ecfe-ddb5-4c07-bdaf-16ff505870d9\\proofs';

test.beforeAll(async () => {
  if (!fs.existsSync(PROOF_DIR)) {
    fs.mkdirSync(PROOF_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARTIFACT_PROOF_DIR)) {
    fs.mkdirSync(ARTIFACT_PROOF_DIR, { recursive: true });
  }
});

async function saveProof(page: any, name: string) {
  const file1 = path.join(PROOF_DIR, `${name}.png`);
  const file2 = path.join(ARTIFACT_PROOF_DIR, `${name}.png`);
  await page.screenshot({ path: file1, fullPage: true });
  await page.screenshot({ path: file2, fullPage: true });
  console.log(`📸 Captured proof: ${file1}`);
}

test.describe('Capture Master Proof Screenshots across Portals and Roles', () => {

  test('01. Proof: Public Landing Page & Fleet Specs', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_01_public_landing');
  });

  test('02. Proof: Admin Executive Portal & Live Fleet', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zerogroup.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/admin/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_02_admin_dashboard');

    await page.goto('/admin/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_02b_admin_live_map');
  });

  test('03. Proof: Staff Operations & Central Dispatch Board', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'staff@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/staff/dashboard', { waitUntil: 'load' });
    await page.waitForSelector('text=Staff Operations Dashboard', { timeout: 30000 });
    await page.waitForTimeout(2000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_03_staff_dashboard');

    await page.goto('/staff/dispatch', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_03b_staff_dispatch_board');
  });

  test('04. Proof: Owner Executive Overview & Settlements', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'akshairajesh07@gmail.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/owner/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_04_owner_dashboard');

    await page.goto('/owner/settlements', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_04b_owner_settlements');
  });

  test('05. Proof: Driver Mobile Hub & Active Dispatches', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'driver@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/driver/home', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_05_driver_home');
  });

  test('06. Proof: Operator Field Interface & Ledger', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'operator@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/operator/home', { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    await expect(page.locator('body')).toBeVisible();
    await saveProof(page, 'proof_06_operator_home');
  });

});
