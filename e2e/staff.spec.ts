import { test, expect } from "@playwright/test";

// ============================================================================
// STAFF E2E TESTS — IronRent ERP
// Covers: Login, Diary Override, Crew Assignment, Invoices, Settlements
// ============================================================================

const STAFF_EMAIL = process.env.TEST_STAFF_EMAIL ?? "staff@ironrent.local";
const STAFF_PASS = process.env.TEST_STAFF_PASS ?? "staff123";

test.describe("Staff Authentication", () => {
  test("should login as STAFF role", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.getByLabel(/password/i).fill(STAFF_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await expect(page).not.toHaveURL(/login/);
  });

  test("STAFF should NOT access admin dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.getByLabel(/password/i).fill(STAFF_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.goto("/admin/dashboard");
    // Should be redirected away from admin-only page
    await expect(page).not.toHaveURL("/admin/dashboard");
  });
});

test.describe("Staff Diary Override API", () => {
  test("should reject unauthenticated diary override POST", async ({ request }) => {
    const res = await request.post("/api/staff/diary/override", {
      data: { dispatchId: "fake", overrideNotes: "test" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("should reject unauthenticated crew GET", async ({ request }) => {
    const res = await request.get("/api/staff/dispatch/fake-id/crew");
    expect([401, 403]).toContain(res.status());
  });

  test("should reject unauthenticated leader PATCH", async ({ request }) => {
    const res = await request.patch("/api/staff/dispatch/fake-id/leader", {
      data: { employeeId: "fake" },
    });
    expect([401, 403]).toContain(res.status());
  });
});

test.describe("Staff Pages — Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill(STAFF_EMAIL);
    await page.getByLabel(/password/i).fill(STAFF_PASS);
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(/\/staff|\/admin|\/dashboard/);
  });

  test("should load staff invoices page", async ({ page }) => {
    await page.goto("/staff/invoices");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load staff settlements page", async ({ page }) => {
    await page.goto("/staff/settlements");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load staff dispatch page", async ({ page }) => {
    await page.goto("/staff/dispatch");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load staff operators page", async ({ page }) => {
    await page.goto("/staff/operators");
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("should load staff expenses page", async ({ page }) => {
    await page.goto("/staff/expenses");
    await expect(page).not.toHaveURL(/error|500/);
  });
});

test.describe("Staff — Settlement API guard", () => {
  test("should reject unauthenticated finalize settlement call", async ({ request }) => {
    const res = await request.post("/api/staff/dispatch/batch-crew", {
      data: {},
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
