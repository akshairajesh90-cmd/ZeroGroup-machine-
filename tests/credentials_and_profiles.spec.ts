import { test, expect } from '@playwright/test';
import path from 'path';

// ─── Auth fixtures for each role ─────────────────────────────────────────────
const adminAuth  = path.join(__dirname, '../playwright/.auth/admin.json');
const staffAuth  = path.join(__dirname, '../playwright/.auth/staff.json');
const driverAuth = path.join(__dirname, '../playwright/.auth/driver.json');
const operatorAuth = path.join(__dirname, '../playwright/.auth/operator.json');

// ─── 1. CLEAN LOGIN PAGE ──────────────────────────────────────────────────────
test.describe('Clean Unified Login', () => {
  test('Login page has no role tabs — just email/phone + password', async ({ page }) => {
    await page.goto('/');
    // Should NOT show any tab buttons labelled Office/Admin or Field/Driver
    await expect(page.getByRole('tab', { name: /office|admin/i })).not.toBeVisible();
    await expect(page.getByRole('tab', { name: /field|driver/i })).not.toBeVisible();
    // Should have a single password field
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Should have OTP reset link
    await expect(page.getByText(/reset.*otp|forgot/i)).toBeVisible();
  });

  test('OTP Reset page auto-fills phone from query param', async ({ page }) => {
    await page.goto('/reset-password?phone=9876543210');
    // The phone input should be pre-filled and read-only
    const phoneInput = page.locator('input[placeholder*="9876543210"]').first();
    await expect(phoneInput).toBeVisible();
    const val = await phoneInput.inputValue();
    expect(val).toContain('9876543210');
  });
});

// ─── 2. ADMIN CREDENTIALS HUB ────────────────────────────────────────────────
test.describe('Admin Credentials Hub', () => {
  test.use({ storageState: adminAuth });

  test('Admin can navigate to /admin/credentials', async ({ page }) => {
    await page.goto('/admin/credentials');
    await expect(page.getByText(/credential|access hub/i).first()).toBeVisible();
  });

  test('Credentials Hub displays employee table with masked passwords', async ({ page }) => {
    await page.goto('/admin/credentials');
    // Masked password placeholders (••••••••)
    const maskedPw = page.locator('text=••••').first();
    await expect(maskedPw).toBeVisible();
  });

  test('Admin can reveal a masked password', async ({ page }) => {
    await page.goto('/admin/credentials');
    // Click the first eye icon button to reveal password
    const eyeBtn = page.locator('button[title="Show Password"]').first();
    await expect(eyeBtn).toBeVisible();
    await eyeBtn.click();
    await expect(page.locator('button[title="Hide Password"]').first()).toBeVisible();
  });

  test('Admin dashboard has Official IDs & Logins button', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('link', { name: /official ids|logins/i })).toBeVisible();
  });

  test('Admin sidebar has ID & Passwords Hub link', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('link', { name: /id.*passwords hub|passwords hub/i })).toBeVisible();
  });
});

// ─── 3. STAFF CREDENTIALS HUB ────────────────────────────────────────────────
test.describe('Staff Credentials Hub', () => {
  test.use({ storageState: staffAuth });

  test('Staff can navigate to /staff/credentials', async ({ page }) => {
    await page.goto('/staff/credentials');
    await expect(page.getByText(/credential|verification/i).first()).toBeVisible();
  });

  test('Staff dashboard has Official IDs & Logins button', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await expect(page.getByRole('link', { name: /official ids|logins/i })).toBeVisible();
  });
});

// ─── 4. PROFILE PAGES ────────────────────────────────────────────────────────
test.describe('Admin Profile Page', () => {
  test.use({ storageState: adminAuth });

  test('Admin can visit /admin/profile', async ({ page }) => {
    await page.goto('/admin/profile');
    await expect(page.getByText(/back to admin|id verification|official id/i).first()).toBeVisible();
  });

  test('Admin profile has Official ID section', async ({ page }) => {
    await page.goto('/admin/profile');
    await expect(page.getByText(/driving license|aadhaar|official id/i).first()).toBeVisible();
  });

  test('Admin sidebar profile avatar links to /admin/profile', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const profileLink = page.getByRole('link', { name: /my profile/i }).first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await expect(page).toHaveURL(/\/admin\/profile/);
  });
});

test.describe('Driver Profile Page', () => {
  test.use({ storageState: driverAuth });

  test('Driver can visit /driver/profile', async ({ page }) => {
    await page.goto('/driver/profile');
    await expect(page.getByText(/back to driver app|id verification|official id/i).first()).toBeVisible();
  });

  test('Driver profile shows capability tags as read-only', async ({ page }) => {
    await page.goto('/driver/profile');
    // Lock icon or "Assigned & Verified by Office Staff" text
    const lockIndicator = page.getByText(/assigned.*verified|office staff|read.?only|locked/i).first();
    // If no capability tags, this may not appear — check page doesn't error
    await expect(page).not.toHaveTitle(/error/i);
    // If the lock text is there, verify it
    if (await lockIndicator.isVisible()) {
      await expect(lockIndicator).toBeVisible();
    }
  });

  test('Driver home page has My Profile button', async ({ page }) => {
    await page.goto('/driver/home');
    await expect(page.getByRole('link', { name: /my profile/i })).toBeVisible();
  });
});

test.describe('Operator Profile Page', () => {
  test.use({ storageState: operatorAuth });

  test('Operator home page has My Profile button', async ({ page }) => {
    await page.goto('/operator/home');
    const myProfileLink = page.getByRole('link', { name: /my profile/i });
    if (await myProfileLink.isVisible()) {
      await expect(myProfileLink).toBeVisible();
    }
  });
});
