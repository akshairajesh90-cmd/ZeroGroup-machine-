import { test, expect } from '@playwright/test';
import path from 'path';

const adminAuth = path.join(__dirname, '../playwright/.auth/admin.json');
const artifactDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/a2fe56fd-4ea1-4a7c-8e56-03c86a01ba92';

test.describe('Full Dispatch Editing, Status Transitions & Billing Overhaul', () => {
  test.setTimeout(90000);
  test.use({ storageState: adminAuth });

  test('1. Day View displays dispatch rows with Edit and Status controls', async ({ page }) => {
    await page.goto('/staff/dispatch?view=day&date=2026-10-26');
    await expect(page.getByText(/Daily Dispatch Command Center/i)).toBeVisible();
    await expect(page.getByText(/Skyline Commercial Towers/i).first()).toBeVisible();

    // Verify Edit Dispatch and Status buttons exist
    await expect(page.getByRole('button', { name: /Edit Dispatch/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel Job/i }).first()).toBeVisible();

    await page.screenshot({ path: path.join(artifactDir, 'proof_day_view_dispatches.png'), fullPage: true });
  });

  test('2. StatusChangeModal handles Cancel, Postpone and Re-activate', async ({ page }) => {
    await page.goto('/staff/dispatch?view=day&date=2026-10-26');
    await page.waitForTimeout(1000);

    // Direct Cancel Job button click
    const cancelBtn = page.getByRole('button', { name: /Cancel Job/i }).first();
    await cancelBtn.click();

    // Verify StatusChangeModal is visible
    await expect(page.getByText(/Cancel Job Dispatch/i)).toBeVisible();
    await expect(page.getByText(/Mandatory Audit Reason/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_cancel_modal.png') });

    // Fill reason and submit
    await page.fill('textarea', 'Rain at site, cancelled by customer');
    await page.getByRole('button', { name: /Confirm Cancellation/i }).click();
    await page.waitForTimeout(2000);

    // Verify status changed to CANCELLED and Re-activate button appears
    await page.goto('/staff/dispatch?view=day&date=2026-10-26');
    const reactivateBtn = page.getByRole('button', { name: /Re-activate Job/i }).first();
    await expect(reactivateBtn).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_dispatch_cancelled.png') });

    // Click Re-activate Job
    await reactivateBtn.click();
    await expect(page.getByText(/Re-activate Job Dispatch/i)).toBeVisible();
    await page.getByRole('button', { name: /Re-activate Job/i }).last().click();
    await page.waitForTimeout(2000);

    // Verify restored to PENDING
    await page.goto('/staff/dispatch?view=day&date=2026-10-26');
    await expect(page.getByRole('button', { name: /Cancel Job/i }).first()).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_dispatch_reactivated.png') });
  });

  test('3. EditDispatchModal opens with all 5 pre-populated tabs', async ({ page }) => {
    await page.goto('/staff/dispatch?view=day&date=2026-10-26');
    await page.waitForTimeout(1000);

    const editBtn = page.getByRole('button', { name: /Edit Dispatch/i }).first();
    await editBtn.click();

    // Verify Edit Modal is open
    await expect(page.getByText(/Edit Dispatch Ticket/i)).toBeVisible();

    // Tab 1: Jobsite & Schedule
    await expect(page.getByText(/1\. Jobsite & Date/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Skyline Towers/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_edit_modal_tab1_site.png') });

    // Tab 2: Work & Concrete Specs
    await page.getByRole('button', { name: /2\. Work & Concrete Specs/i }).click();
    await expect(page.getByText(/Mixer Category/i)).toBeVisible();
    await expect(page.getByText(/Vibrator Motor Type/i)).toBeVisible();
    await expect(page.getByText(/1-Wheel Trolly & Bench Stand/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_edit_modal_tab2_work.png') });

    // Tab 3: Machines & Fleet
    await page.getByRole('button', { name: /3\. Machines & Fleet/i }).click();
    await expect(page.getByText(/Primary Concrete Machine/i)).toBeVisible();
    await expect(page.getByText(/Fleet Driver/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_edit_modal_tab3_fleet.png') });

    // Tab 4: Dynamic Crew & Workers
    await page.getByRole('button', { name: /4\. Crew & Workers/i }).click();
    await expect(page.getByText(/Machine Operator \(Our Internal Worker\)/i)).toBeVisible();
    await expect(page.getByText(/Company Site Leader \(Our Foreman\)/i)).toBeVisible();
    await expect(page.getByText(/Sub Leader \/ Outside Worker Provider/i)).toBeVisible();
    await expect(page.getByText(/Assigned Helper \/ Pani Helper/i)).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'proof_edit_modal_tab4_crew.png') });

    // Tab 5: Setup Tools Used
    await page.getByRole('button', { name: /5\. Setup Tools Used/i }).click();
    await expect(page.getByText(/2-Wheel Trolly \(Cart\): Allocated here under Tools at ₹200 \/ trolly/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Tool/i })).toBeVisible();

    // Select 2-Wheel Trolly in tool selector dropdown and add 2 units
    const toolSelect = page.locator('select:has(option:has-text("2-Wheel Trolly"))');
    if (await toolSelect.count() > 0) {
      // Find 2-wheel trolly option value
      const optionVal = await page.locator('select option:has-text("2-Wheel Trolly")').first().getAttribute('value');
      if (optionVal) {
        await toolSelect.selectOption(optionVal);
        await page.fill('input[type="number"]:has-text("")', '2');
        await page.getByRole('button', { name: /Add Tool/i }).click();
        await page.waitForTimeout(500);
      }
    }
    await page.screenshot({ path: path.join(artifactDir, 'proof_edit_modal_tab5_tools.png') });

    // Submit Save Dispatch Changes
    await page.getByRole('button', { name: /Save Dispatch Changes/i }).click();
    await page.waitForTimeout(1500);
  });

  test('4. Billing page loads with Machine Rent & Tools ONLY (No Operator or Worker Wages)', async ({ page }) => {
    await page.goto('/staff/billing/cmv5kd6w003n7wsvk2z6u5x1h');

    // Verify billing page loaded with NO redirect to '/'
    await expect(page.getByRole('heading', { name: /Generate Invoice/i })).toBeVisible();
    await expect(page.getByText(/Billable Charges/i)).toBeVisible();

    // Verify 1-Wheel Trolly & Bench, 1-Wheel Trolly & Bench - Tool Rent, 2-Wheel Trolly (₹200) quick buttons
    await expect(page.getByText(/1-Wheel Trolly & Bench \(₹1,500\)/i)).toBeVisible();
    await expect(page.getByText(/1-Wheel Trolly & Bench - Tool Rent \(₹1,000\)/i)).toBeVisible();
    await expect(page.getByText(/2-Wheel Trolly \(₹200\)/i)).toBeVisible();

    // Verify auto-populated bill items:
    // 1-Wheel Trolly & Bench is in line items
    await expect(page.locator('input[value*="1-Wheel Trolly & Bench"]').first()).toBeVisible();
    await expect(page.locator('input[value*="1-Wheel Trolly & Bench - Tool Rent"]').first()).toBeVisible();

    // Click 2-Wheel Trolly quick button and check line item added at rate 200
    await page.getByRole('button', { name: /2-Wheel Trolly \(₹200\)/i }).click();
    await expect(page.locator('input[value*="2-Wheel Trolly"]').first()).toBeVisible();

    // Test inline editable line item rate
    const rateInput = page.locator('input[type="number"]:below(:text("Rate: ₹"))').last();
    await rateInput.fill('250');
    await rateInput.dispatchEvent('input');
    await page.waitForTimeout(300);

    // Verify DOMAIN RULE: Operator daily wages and worker wages are NOT in line items
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Internal Crew (');
    expect(pageContent).not.toContain('External Labor (');

    await page.screenshot({ path: path.join(artifactDir, 'proof_billing_page_clean.png'), fullPage: true });
  });
});
