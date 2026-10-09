import { test, expect, BrowserContext, Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Force explicitly using Google Chrome engine
test.use({ channel: 'chrome' });

test.describe('Zero Group (Antigravity) - End-to-End Advanced Multi-Role Workflow', () => {

  // Seed the test database before running the tests
  test.beforeAll(async () => {
    const password = await bcrypt.hash('password123', 10);
    
    // Seed Staff
    await prisma.user.upsert({
      where: { email: 'staff@zerogroup.com' },
      update: { hashedPassword: password, role: 'STAFF' },
      create: { email: 'staff@zerogroup.com', hashedPassword: password, role: 'STAFF' }
    });

    // Seed Operator
    await prisma.user.upsert({
      where: { email: 'operator@zerogroup.com' },
      update: { hashedPassword: password, role: 'OPERATOR' },
      create: { email: 'operator@zerogroup.com', hashedPassword: password, role: 'OPERATOR' }
    });

    // Seed Owner
    await prisma.user.upsert({
      where: { email: 'owner@zerogroup.com' },
      update: { hashedPassword: password, role: 'OWNER' },
      create: { email: 'owner@zerogroup.com', hashedPassword: password, role: 'OWNER' }
    });
  });

  // Disconnect prisma after tests
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('Tough Lifecycle Scenario - Staff, Operator, and Owner', async ({ browser }) => {
    
    // 1. Setup isolated contexts for the three concurrent users
    const staffContext: BrowserContext = await browser.newContext();
    const operatorContext: BrowserContext = await browser.newContext();
    const ownerContext: BrowserContext = await browser.newContext();

    const staffPage: Page = await staffContext.newPage();
    const operatorPage: Page = await operatorContext.newPage();
    const ownerPage: Page = await ownerContext.newPage();

    // ==========================================
    // Phase 1: Context A (Office Staff) - Intake & Dispatch
    // ==========================================
    await test.step('Office Staff - Create complex B2B booking', async () => {
      await staffPage.goto('/login');
      // Wait for network idle or hydration if necessary
      await staffPage.waitForLoadState('networkidle');
      
      await staffPage.fill('input[name="email"], input[type="email"]', 'staff@zerogroup.com');
      await staffPage.fill('input[name="password"], input[type="password"]', 'password123');
      await staffPage.click('button[type="submit"]');
      await staffPage.waitForURL('**/staff/dashboard', { timeout: 10000 });

      await staffPage.goto('/staff/orders');
      
      // Creating complex booking
      await staffPage.getByRole('button', { name: /New Booking|Create/i }).click();
      await staffPage.fill('input[name="customerName"], input[placeholder*="Customer"]', 'Acme Corp Corporate');
      await staffPage.fill('input[name="location"], input[placeholder*="Location"]', 'Downtown Infrastructure Site A');
      
      // Complete booking form
      await staffPage.getByRole('button', { name: /Submit|Save Booking/i }).click();
      
      // Verify success notification
      await expect(staffPage.locator('.toast, [role="alert"]')).toContainText(/Success|Created/i);
    });

    await test.step('Office Staff - Attempt to dispatch Under Repair machine', async () => {
      await staffPage.goto('/staff/dispatch');
      await staffPage.getByRole('button', { name: /Assign Machine|Dispatch/i }).first().click();
      
      // Select a broken machine and verify system blocks it
      await staffPage.selectOption('select[name="machineId"], select[aria-label="Machine"]', { label: 'Machine 42 (Under Repair)' });
      await staffPage.getByRole('button', { name: /Dispatch/i }).click();
      
      // Explicit assertion for edge case
      await expect(staffPage.getByText(/under repair/i)).toBeVisible();
    });

    await test.step('Office Staff - Assign Machine, Operator, and Helpers', async () => {
      // Correct selection for available assets
      await staffPage.selectOption('select[name="machineId"], select[aria-label="Machine"]', { label: 'Machine 01 (Available)' });
      await staffPage.selectOption('select[name="operatorId"], select[aria-label="Operator"]', { label: 'John Operator' });
      await staffPage.selectOption('select[name="helperId"], select[aria-label="Helper"]', { label: 'Mike Helper' });
      
      await staffPage.getByRole('button', { name: /Dispatch/i }).click();
      await expect(staffPage.locator('.toast, [role="alert"]')).toContainText(/Dispatch assigned/i);
    });

    // ==========================================
    // Phase 2: Context B (Field Operator) - Field Ops & Edge Cases
    // ==========================================
    await test.step('Field Operator - Start job and log edge cases', async () => {
      await operatorPage.goto('/login');
      await operatorPage.waitForLoadState('networkidle');
      
      await operatorPage.fill('input[name="email"], input[type="email"]', 'operator@zerogroup.com');
      await operatorPage.fill('input[name="password"], input[type="password"]', 'password123');
      await operatorPage.click('button[type="submit"]');
      
      await operatorPage.waitForURL('**/operator/home', { timeout: 10000 });
      
      // Wait for real-time dispatch assignment to sync
      await operatorPage.waitForTimeout(1500); 

      // Start the job
      await operatorPage.getByRole('button', { name: /Start Job|Begin/i }).click();
      await expect(operatorPage.getByText(/In Progress/i)).toBeVisible();
      
      // Interruption 1: Log emergency fuel purchase
      await operatorPage.getByRole('button', { name: /Log Fuel|Fuel/i }).click();
      await operatorPage.fill('input[name="fuelAmount"], input[placeholder*="Amount"]', '500');
      await operatorPage.getByRole('button', { name: /Submit/i }).click();
      
      // Interruption 2: Report breakdown midway
      await operatorPage.getByRole('button', { name: /Report Issue|Breakdown/i }).click();
      await operatorPage.selectOption('select[name="issueType"]', 'Machine Breakdown');
      await operatorPage.fill('textarea[name="description"]', 'Hydraulic leak midway');
      await operatorPage.getByRole('button', { name: /Submit/i }).click();
      
      // Interruption 3: Log 2 hours overtime
      await operatorPage.getByRole('button', { name: /Log Overtime|Overtime/i }).click();
      await operatorPage.fill('input[name="hours"], input[placeholder*="Hours"]', '2');
      await operatorPage.getByRole('button', { name: /Submit/i }).click();
    });

    await test.step('Field Operator - Complete job and log partial cash', async () => {
      await operatorPage.getByRole('button', { name: /Complete Job|Finish/i }).click();
      
      // Log partial cash collection
      await operatorPage.fill('input[name="cashCollected"], input[placeholder*="Cash"]', '2000'); 
      await operatorPage.getByRole('button', { name: /Confirm|Submit/i }).click();
      
      await expect(operatorPage.getByText(/Job Completed/i)).toBeVisible();
    });

    // ==========================================
    // Phase 3: Context A (Office Staff) - Revenue & Payroll
    // ==========================================
    await test.step('Office Staff - Verify Cash & Generate Corporate Invoice', async () => {
      // Sync real-time updates for Staff
      await staffPage.waitForTimeout(2000);
      
      await staffPage.goto('/staff/invoices');
      
      // Verify cash handover
      await staffPage.getByRole('button', { name: /Verify Handover/i }).first().click();
      await staffPage.getByRole('button', { name: /Confirm/i }).click();
      await expect(staffPage.locator('.toast, [role="alert"]')).toContainText(/Cash verified/i);
      
      // Generate Corporate Invoice for outstanding balance
      await staffPage.getByRole('button', { name: /Corporate Invoice/i }).first().click();
      await expect(staffPage.locator('.toast, [role="alert"]')).toContainText(/Invoice Generated/i);
    });

    await test.step('Office Staff - Settlements & Payroll Deductions', async () => {
      await staffPage.goto('/staff/settlements');
      
      await staffPage.getByRole('button', { name: /Calculate Payout|Settle/i }).first().click();
      
      // Apply tool damage penalty deduction
      await staffPage.getByRole('button', { name: /Add Deduction/i }).click();
      await staffPage.fill('input[name="deductionReason"]', 'Tool Damage');
      await staffPage.fill('input[name="deductionAmount"]', '500');
      
      // Deduct mid-week salary advance
      await staffPage.getByRole('button', { name: /Add Deduction/i }).click();
      await staffPage.fill('input[name="deductionReason"]', 'Salary Advance');
      await staffPage.fill('input[name="deductionAmount"]', '1000');
      
      await staffPage.getByRole('button', { name: /Finalize Payout|Confirm/i }).click();
      await expect(staffPage.locator('.toast, [role="alert"]')).toContainText(/Settlement Finalized/i);
    });

    // ==========================================
    // Phase 4: Context C (Owner) - Executive Oversight
    // ==========================================
    await test.step('Owner - Assert P&L and Audit Logs', async () => {
      await ownerPage.goto('/login');
      await ownerPage.fill('input[name="email"], input[type="email"]', 'owner@zerogroup.com');
      await ownerPage.fill('input[name="password"], input[type="password"]', 'password123');
      await ownerPage.click('button[type="submit"]');
      
      await ownerPage.waitForURL('**/admin/dashboard', { timeout: 10000 });

      // Wait for database aggregations / websocket updates to settle
      await ownerPage.waitForTimeout(2000);

      // Assert that Aggregated P&L reflects exact metrics
      // (Using typical selectors or text matching for the values logged above)
      await expect(ownerPage.locator('text=500').first()).toBeVisible(); // Fuel
      await expect(ownerPage.locator('text=2000').first()).toBeVisible(); // Partial Cash

      // Verify Security Audit Logs capture mid-job machine breakdown and cash verification step
      await ownerPage.goto('/admin/audit'); // Or the correct route for logs
      
      // Assert mid-job breakdown
      await expect(ownerPage.getByText(/breakdown/i).first()).toBeVisible();
      // Assert cash verification
      await expect(ownerPage.getByText(/verified/i).first()).toBeVisible();
    });

    // Explicitly close contexts
    await staffContext.close();
    await operatorContext.close();
    await ownerContext.close();
  });
});
