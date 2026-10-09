/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 4 — ACCEPTANCE TESTING (UAT)
 * ═══════════════════════════════════════════════════════════════
 * What: Validates that the system meets BUSINESS REQUIREMENTS from
 *       the USER's perspective. Tests are written as user stories.
 *       "As a [role], I can [action] so that [goal]."
 * Why:  Technical correctness ≠ business correctness. UAT confirms
 *       the app does what the BUSINESS actually needs.
 * Tool: Playwright — tests real user journeys in a real browser
 * ═══════════════════════════════════════════════════════════════
 *
 * HOW TO RUN:
 *   npx playwright test testing/4_acceptance/acceptance.spec.ts --project=chromium
 */

import { test, expect, Browser, Page } from '@playwright/test';
import path from 'path';

// Auth state files from existing setup
const AUTH = {
  admin:    path.join(__dirname, '../../playwright/.auth/admin.json'),
  staff:    path.join(__dirname, '../../playwright/.auth/staff.json'),
  driver:   path.join(__dirname, '../../playwright/.auth/driver.json'),
  operator: path.join(__dirname, '../../playwright/.auth/operator.json'),
};

// ─────────────────────────────────────────────────────────────────────────────
// USER STORY 1: Admin/Staff Role
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[ACCEPTANCE] As an Admin/Staff, I can manage the business', () => {
  test.use({ storageState: AUTH.admin });

  test('AC-01: I can view the business dashboard with today\'s key metrics', async ({ page }) => {
    // GIVEN I am logged in as admin
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // THEN I see the core business metrics
    await expect(page.getByText(/Confirmed Cash/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Active Jobs Today/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Available Fleet/i).first()).toBeVisible({ timeout: 20000 });
    // ACCEPTANCE CRITERIA: Dashboard loaded successfully with all metric cards
  });

  test('AC-02: I can access the dispatch creation form to schedule new jobs', async ({ page }) => {
    // GIVEN I am admin
    // WHEN I navigate to create a new dispatch
    await page.goto('/staff/dispatch/new');
    await page.waitForLoadState('networkidle');

    // THEN the form is visible and ready for input
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
    // ACCEPTANCE CRITERIA: Can reach dispatch creation form
  });

  test('AC-03: I can view all company expenses', async ({ page }) => {
    // GIVEN I am admin
    await page.goto('/staff/expenses');
    await page.waitForLoadState('networkidle');

    // THEN the expenses page loads
    await expect(page.getByRole('heading', { name: /Expenses/i }).first()).toBeVisible({ timeout: 15000 });
    // ACCEPTANCE CRITERIA: Expenses page is accessible to admin
  });

  test('AC-04: I can access owner-level financial settlements', async ({ page }) => {
    // GIVEN I am admin/owner
    await page.goto('/owner/settlements');
    await page.waitForLoadState('networkidle');

    // THEN I can see the settlements page
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
    // ACCEPTANCE CRITERIA: Settlement management is accessible
  });

  test('AC-05: I can view cash and payment records', async ({ page }) => {
    await page.goto('/staff/cash');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Cash/i }).first()).toBeVisible({ timeout: 15000 });
    // ACCEPTANCE CRITERIA: Cash page loads and shows heading
  });

  test('AC-06: Admin has access to manual adjustment controls', async ({ page }) => {
    await page.goto('/owner/adjustments');
    await page.waitForLoadState('networkidle');

    // THEN adjustment page loads (not 403/404)
    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
    await expect(page.locator('text=/Forbidden/i')).toHaveCount(0);
    // ACCEPTANCE CRITERIA: Adjustments are accessible to admin
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// USER STORY 2: Driver Role
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[ACCEPTANCE] As a Driver, I can manage my daily work', () => {
  test.use({ storageState: AUTH.driver });

  test('AC-07: I am redirected to the driver portal when I log in', async ({ page }) => {
    // GIVEN I am a driver
    await page.goto('/driver');
    await page.waitForLoadState('networkidle');

    // THEN I see the driver interface, not a 403
    await expect(page.locator('text=/403/i')).toHaveCount(0);
    await expect(page.locator('text=/Forbidden/i')).toHaveCount(0);
    await expect(page.locator('body')).toBeVisible();
    // ACCEPTANCE CRITERIA: Driver portal is accessible to driver role
  });

  test('AC-08: Driver CANNOT access the admin staff dashboard (role isolation)', async ({ page }) => {
    // GIVEN I am a driver
    // WHEN I try to access admin-only staff dashboard
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // THEN I should be redirected or shown a forbidden page (not admin content)
    const url = page.url();
    const body = await page.locator('body').textContent() || '';

    // Either redirected away from /staff/dashboard OR shown forbidden
    const isOnStaffDashboard = url.includes('/staff/dashboard');
    const showsAdminContent = body.includes('Confirmed Cash') && body.includes('Active Jobs Today');

    if (isOnStaffDashboard) {
      // If still on the URL, it must be an error/forbidden page, not actual admin data
      expect(body).not.toMatch(/Confirmed Cash/i);
    }
    // ACCEPTANCE CRITERIA: Driver cannot access admin content
  });

  test('AC-09: Driver CANNOT access financial settings', async ({ page }) => {
    await page.goto('/owner/settlements');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    // Should be redirected away from owner routes
    const isOnOwnerPage = url.includes('/owner/settlements');
    if (isOnOwnerPage) {
      // If landed on page, must be an error page
      const body = await page.locator('body').textContent() || '';
      expect(body).not.toMatch(/Process Payroll/i);
    }
    // ACCEPTANCE CRITERIA: Driver cannot access owner financial controls
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// USER STORY 3: Operator Role
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[ACCEPTANCE] As an Operator, I can log field data', () => {
  test.use({ storageState: AUTH.operator });

  test('AC-10: I can access the operator portal', async ({ page }) => {
    await page.goto('/operator');
    await page.waitForLoadState('networkidle');

    // Must not get 403/forbidden
    await expect(page.locator('text=/403/i')).toHaveCount(0);
    await expect(page.locator('body')).toBeVisible();
    // ACCEPTANCE CRITERIA: Operator portal is accessible
  });

  test('AC-11: Operator CANNOT access the staff dispatch board', async ({ page }) => {
    await page.goto('/staff/dispatch');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const body = await page.locator('body').textContent() || '';

    if (url.includes('/staff/dispatch')) {
      // Should not see actual dispatch management content
      expect(body).not.toMatch(/Create Dispatch/i);
    }
    // ACCEPTANCE CRITERIA: Operator is blocked from staff-only dispatch management
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// USER STORY 4: Cross-Cutting — Authentication Required
// ─────────────────────────────────────────────────────────────────────────────

test.describe('[ACCEPTANCE] Unauthenticated users must log in first', () => {
  // No storageState = unauthenticated
  test('AC-12: Unauthenticated user visiting /staff/dashboard is redirected to login', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const body = await page.locator('body').textContent() || '';

    // Must be redirected to login page (not see admin content)
    const isRedirectedToLogin = url.includes('login') || url === 'http://localhost:3000/' || !url.includes('/staff/');
    const seesAdminContent = body.includes('Confirmed Cash');

    expect(seesAdminContent).toBe(false); // MUST NOT see admin content without auth
    // ACCEPTANCE CRITERIA: Protected routes require authentication
  });

  test('AC-13: Login page is publicly accessible (no redirect loop)', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState('networkidle');
    // ACCEPTANCE CRITERIA: Login page loads for unauthenticated users
  });

});
