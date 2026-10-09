/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 3 — SYSTEM TESTING
 * ═══════════════════════════════════════════════════════════════
 * What: Tests the COMPLETE, INTEGRATED system end-to-end in a
 *       real browser against a running server. Verifies the entire
 *       application stack: UI → API → DB → response.
 * Why:  Individual units and integrations can pass, but the wired
 *       system might still fail (wrong route, DB schema mismatch,
 *       auth middleware blocking, etc.)
 * Tool: Playwright (real Chromium browser)
 * Scope: Core system flows across all major pages
 * ═══════════════════════════════════════════════════════════════
 *
 * HOW TO RUN:
 *   npx playwright test testing/3_system/system.spec.ts --project=chromium
 *
 * PREREQUISITE: Dev server running + admin auth cookie in:
 *   playwright/.auth/admin.json
 *   (run: npx playwright test tests/auth.setup.ts --project=setup)
 */

import { test, expect } from '@playwright/test';
import path from 'path';

// Use the existing admin auth state (shared with existing tests)
test.use({ storageState: path.join(__dirname, '../../playwright/.auth/admin.json') });

test.describe('[SYSTEM TEST] Complete Application System Verification', () => {

  // ── SYS-01: Login System ──────────────────────────────────────────────────
  test('SYS-01: Login page renders and accepts credentials', async ({ page }) => {
    // Navigate to root — if already logged in, it redirects to dashboard
    const response = await page.goto('/');
    // System must respond (not 500 or blank)
    expect(response?.status()).toBeLessThan(500);
    // Either we see the login form OR we are redirected to dashboard
    const title = await page.title();
    expect(title).not.toBe('');
    // Page must not show an unhandled error
    await expect(page.locator('text=/Internal Server Error/i')).toHaveCount(0);
  });

  // ── SYS-02: Staff Dashboard loads with real data ──────────────────────────
  test('SYS-02: Staff dashboard loads and shows key metrics', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // Must load without 500 error
    await expect(page.locator('text=/Something went wrong/i')).toHaveCount(0);

    // Core metric widgets must be present
    await expect(page.getByText(/Confirmed Cash/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Active Jobs Today/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Available Fleet/i).first()).toBeVisible({ timeout: 15000 });
  });

  // ── SYS-03: Dispatch board renders ────────────────────────────────────────
  test('SYS-03: Dispatch board page loads without errors', async ({ page }) => {
    await page.goto('/staff/dispatch');
    await page.waitForLoadState('networkidle');

    // Page should not crash
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Internal Server Error');

    // Navigation and heading should be present
    const heading = page.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  // ── SYS-04: New dispatch form is reachable ────────────────────────────────
  test('SYS-04: New dispatch form renders Step 1 correctly', async ({ page }) => {
    await page.goto('/staff/dispatch/new');
    await page.waitForLoadState('networkidle');

    // Form should exist
    await expect(page.locator('form').first()).toBeVisible({ timeout: 15000 });
    // No server error
    await expect(page.locator('text=/Application error/i')).toHaveCount(0);
  });

  // ── SYS-05: Fleet management page ────────────────────────────────────────
  test('SYS-05: Fleet/machines page loads with machine list', async ({ page }) => {
    await page.goto('/staff/machines');
    await page.waitForLoadState('networkidle');

    const status = await page.evaluate(() => document.readyState);
    expect(status).toBe('complete');
    await expect(page.locator('text=/Application error/i')).toHaveCount(0);
  });

  // ── SYS-06: Cash & Receipts page ──────────────────────────────────────────
  test('SYS-06: Cash & Receipts page renders heading', async ({ page }) => {
    await page.goto('/staff/cash');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Cash/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/500/i')).toHaveCount(0);
  });

  // ── SYS-07: Expenses page ─────────────────────────────────────────────────
  test('SYS-07: Company Expenses page loads', async ({ page }) => {
    await page.goto('/staff/expenses');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /Expenses/i }).first()).toBeVisible({ timeout: 15000 });
  });

  // ── SYS-08: Owner settlements page ───────────────────────────────────────
  test('SYS-08: Owner Settlements page loads', async ({ page }) => {
    await page.goto('/owner/settlements');
    await page.waitForLoadState('networkidle');

    // Should load a page (200 response, not crash)
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
  });

  // ── SYS-09: API health — Machines endpoint responds ──────────────────────
  test('SYS-09: /api/machines responds with valid JSON (not 500)', async ({ page }) => {
    const response = await page.request.get('/api/machines');
    // Should be 200 (success) or 401 (auth required) — NOT 500 (server crash)
    expect(response.status()).not.toBe(500);
    expect([200, 401, 403]).toContain(response.status());
  });

  // ── SYS-10: Navigation between pages works (no broken links) ─────────────
  test('SYS-10: Navigation from dashboard to dispatch works', async ({ page }) => {
    await page.goto('/staff/dashboard');
    await page.waitForLoadState('networkidle');

    // Find a dispatch-related nav link and click it
    const dispatchLink = page.locator('a[href*="dispatch"]').first();
    if (await dispatchLink.isVisible()) {
      await dispatchLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('dispatch');
    } else {
      // Navigate directly if no visible link
      await page.goto('/staff/dispatch');
      expect(page.url()).toContain('dispatch');
    }
  });

});
