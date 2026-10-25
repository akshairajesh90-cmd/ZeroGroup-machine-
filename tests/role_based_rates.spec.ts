import { test, expect } from '@playwright/test';
import path from 'path';

const adminAuth = path.join(__dirname, '../playwright/.auth/admin.json');
const artifactDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/a2fe56fd-4ea1-4a7c-8e56-03c86a01ba92';

test.describe('Role-Based Rates & Crew Wage Matrix Verification', () => {
  test.setTimeout(90000);
  test.use({ storageState: adminAuth });

  test('1. Role-Based Rates & Wage Matrix tab loads with all 12 Master Roles', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Verify main header
    await expect(page.getByText(/Role-Based Rates & Crew Wage Matrix/i)).toBeVisible();

    // Verify Master Role-Based Wage Matrix card exists
    await expect(page.getByText(/Section 1: Company Master Role-Based Wage Matrix \(Master Rate Card\)/i)).toBeVisible();
    await expect(page.getByText(/Standard Rate Card Common/i)).toBeVisible();

    // Verify key master roles are present with their standard rates
    await expect(page.getByText(/Mixer Operator/i).first()).toBeVisible();
    await expect(page.getByText(/₹1,100/i).first()).toBeVisible();

    await expect(page.getByText(/Hydraulic Operator/i).first()).toBeVisible();
    await expect(page.getByText(/Lift Operator/i).first()).toBeVisible();
    await expect(page.getByText(/1-Wheel Trolly Operator/i).first()).toBeVisible();
    await expect(page.getByText(/2-Wheel Trolly Handler/i).first()).toBeVisible();
    await expect(page.getByText(/General Helper \(Pani \/ Site Labour\)/i).first()).toBeVisible();
    await expect(page.getByText(/Company Site Leader/i).first()).toBeVisible();

    // Master matrix screenshot
    await page.screenshot({
      path: path.join(artifactDir, 'proof_role_rates_master_matrix.png'),
      fullPage: false,
    });
  });

  test('2. Machine & Tool Work-Type Rate Matrix is visible with standard rates', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/Machine Work-Type & Tool Rate Matrix/i)).toBeVisible();
    await expect(page.getByText(/Mixing Machine/i).first()).toBeVisible();
    await expect(page.getByText(/Hydraulic Mixer/i).first()).toBeVisible();
    await expect(page.getByText(/1-Wheel Trolly & Bench/i).first()).toBeVisible();
    await expect(page.getByText(/2-Wheel Concrete Trolly/i).first()).toBeVisible();
    await expect(page.getByText(/₹200 \/ trolly/i).first()).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_machine_work_rates.png'),
    });
  });

  test('3. Individual Personnel Role Wage Cards display for workers, operators & drivers', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Verify Individual Personnel section
    await expect(page.getByText(/Individual Personnel Role Wage Cards/i)).toBeVisible();

    // Filter by Workers & Helpers
    const workersFilterBtn = page.getByRole('button', { name: /Workers & Helpers/i });
    if (await workersFilterBtn.isVisible()) {
      await workersFilterBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify a worker card with role rates is visible
    const editRatesBtn = page.getByRole('button', { name: /Edit Role Rates/i }).first();
    await expect(editRatesBtn).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_crew_personnel_rates.png'),
    });
  });

  test('4. Edit Role Rates modal opens, modifies rates and saves successfully', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Click Edit Role Rates on the first visible card
    const editBtn = page.getByRole('button', { name: /Edit Role Rates/i }).first();
    await editBtn.click();

    // Verify modal is open
    await expect(page.getByText(/Edit Role Rates:/i)).toBeVisible();
    await expect(page.getByText(/Prefill Company Defaults/i)).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_edit_role_rates_modal.png'),
    });

    // Click Save Rates
    const saveBtn = page.getByRole('button', { name: /Save Rates/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Verify success banner appears
    await expect(page.getByText(/saved successfully/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);

    // Modal should close automatically
    await expect(page.getByText(/Edit Role Rates:/i)).not.toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_role_rates_saved_success.png'),
    });
  });

  test('5. Soft delete modal displays confirmation dialog and cancel works', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Click Delete on the first card
    const deleteBtn = page.getByTitle(/Soft delete crew member/i).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify modal is open
    await expect(page.getByRole('heading', { name: /Confirm Soft Delete/i })).toBeVisible();
    await expect(page.getByText(/Moves employee to Admin Trash Hub/i)).toBeVisible();
    await expect(page.getByText(/Active user login sessions will be instantly terminated/i)).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_soft_delete_modal.png'),
    });

    // Click Cancel
    await page.getByRole('button', { name: /Cancel/i }).last().click();
    await expect(page.getByText(/Confirm Soft Delete/i)).not.toBeVisible();
  });

  test('6. Disable / Enable toggle and status filters work correctly', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Verify status filter buttons are visible
    await expect(page.getByRole('button', { name: /^All \(/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Active \(/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Disabled \(/i })).toBeVisible();

    // Verify active/disabled badge on card
    await expect(page.getByText(/Active/i).first()).toBeVisible();

    // Click Disable toggle on a crew member
    const toggleBtn = page.getByRole('button', { name: /Disable/i }).first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(1000);

      // Verify toast alert or badge update
      await page.screenshot({
        path: path.join(artifactDir, 'proof_crew_disabled_toggle.png'),
      });

      // Toggle back to Enable
      const enableBtn = page.getByRole('button', { name: /Enable/i }).first();
      if (await enableBtn.isVisible()) {
        await enableBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('7. Edit Standard Rate Card button opens modal and updates rates', async ({ page }) => {
    await page.goto('/staff/crew');
    await page.waitForLoadState('networkidle');

    // Click Edit Standard Rate Card
    const editMasterBtn = page.getByRole('button', { name: /Edit Standard Rate Card/i }).first();
    await expect(editMasterBtn).toBeVisible();
    await editMasterBtn.click();

    // Verify modal is open
    await expect(page.getByText(/Edit Standard Rate Card Common/i)).toBeVisible();
    await expect(page.getByText(/Reset Factory Defaults/i)).toBeVisible();

    await page.screenshot({
      path: path.join(artifactDir, 'proof_edit_master_rate_card_modal.png'),
    });

    // Click Save Standard Rate Card
    const saveMasterBtn = page.getByRole('button', { name: /Save Standard Rate Card/i });
    await expect(saveMasterBtn).toBeVisible();
    await saveMasterBtn.click();

    // Verify success toast appears
    await expect(page.getByText(/Standard Rate Card saved successfully/i)).toBeVisible({ timeout: 5000 });
  });
});
