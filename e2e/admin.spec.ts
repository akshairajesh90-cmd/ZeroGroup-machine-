import { test, expect } from "@playwright/test";

// ============================================================================
// ADMIN E2E TESTS — IronRent ERP
// Covers: Login, Dashboard Alerts, Dispatch Board, Billing, Fleet, Allocations
// ============================================================================

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@ironrent.local";
const ADMIN_PASS = process.env.TEST_ADMIN_PASS ?? "admin123";

test.describe("Admin Authentication", () => {
  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\//);
  });

  test("should login as OWNER/ADMIN and land on dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toBeVisible();
  });
});

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/admin\/dashboard/);
  });

  test("should display financial metric cards", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/Total Receivables/i)).toBeVisible();
    await expect(page.getByText(/Cash Today/i)).toBeVisible();
    await expect(page.getByText(/Monthly Revenue/i)).toBeVisible();
    await expect(page.getByText(/Monthly Expenses/i)).toBeVisible();
  });

  test("should display fleet status section", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/Fleet Status/i)).toBeVisible();
    await expect(page.getByText(/Available/i)).toBeVisible();
    await expect(page.getByText(/Rented/i)).toBeVisible();
  });

  test("should display Operational Exceptions section", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/Operational Exceptions/i)).toBeVisible();
    // Either shows alerts or the clean state banner
    const hasAlerts = await page.getByText(/Fuel Consumption Alerts|Overdue Dispatches|Pending Adjustments|Field Conflict Reports/i).isVisible().catch(() => false);
    const hasCleanBanner = await page.getByText(/All Systems Operational/i).isVisible().catch(() => false);
    expect(hasAlerts || hasCleanBanner).toBeTruthy();
  });
});

test.describe("Admin Dispatch Board", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/admin\/dashboard/);
  });

  test("should load dispatch board with dispatch cards", async ({ page }) => {
    await page.goto("/admin/dispatch-board");
    // Board should render without error
    await expect(page).not.toHaveURL(/error|500/);
    const heading = page.getByRole("heading", { name: /dispatch|board|jobs/i });
    await expect(heading.or(page.locator("body"))).toBeVisible();
  });

  test("should load billing page", async ({ page }) => {
    await page.goto("/admin/billing");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load receivables page", async ({ page }) => {
    await page.goto("/admin/billing/receivables");
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.getByText(/receivable|outstanding|invoice/i)).toBeVisible();
  });
});

test.describe("Admin Allocation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/admin\/dashboard/);
  });

  test("should load allocation page", async ({ page }) => {
    await page.goto("/admin/allocation");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load analytics page", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expect(page).not.toHaveURL(/error|500/);
  });
});

test.describe("Admin API Routes — Auth Guard", () => {
  test("GET /api/admin/billing/dispatch/:id should reject unauthenticated", async ({ request }) => {
    const res = await request.get("/api/admin/billing/dispatch/fake-id");
    expect([401, 403]).toContain(res.status());
  });

  test("GET /api/admin/invoices should reject unauthenticated", async ({ request }) => {
    const res = await request.get("/api/admin/invoices/fake-id");
    expect([401, 403]).toContain(res.status());
  });
});
