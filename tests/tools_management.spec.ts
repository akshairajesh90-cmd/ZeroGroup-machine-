import { test, expect } from '@playwright/test';
import path from 'path';
import { prisma } from '../src/lib/prisma';

const adminAuth = path.join(__dirname, '../playwright/.auth/admin.json');
const artifactDir = 'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/a2fe56fd-4ea1-4a7c-8e56-03c86a01ba92';

test.describe('Tools & Asset Inventory Management', () => {
  test.setTimeout(90000);
  test.use({ storageState: adminAuth });

  test.afterAll(async () => {
    // Cleanup any created test tools
    await prisma.tool.deleteMany({
      where: { toolId: { in: ['TL-TR-99', 'ty-test-ui'] } }
    });
  });

  test('1. Loads Tools Inventory and shows Add Tool Modal', async ({ page }) => {
    await page.goto('/staff/tools');
    await expect(page.getByRole('heading', { name: /Tools & Inventory/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Tool/i })).toBeVisible();

    await page.screenshot({ path: path.join(artifactDir, 'proof_tools_page_initial.png'), fullPage: true });
  });

  test('2. Duplicate Tool ID displays clear error banner without crashing', async ({ page }) => {
    await page.goto('/staff/tools');
    await page.getByRole('button', { name: /Add Tool/i }).click();

    await expect(page.getByText(/Add New Asset/i)).toBeVisible();

    // Fill with existing toolId TL-001
    await page.fill('input[placeholder*="Jackhammer"], input[placeholder*="2 Wheel"]', 'Duplicate Trolly');
    await page.fill('input[placeholder*="TL-001"], input[placeholder*="TL-007"]', 'TL-001');
    await page.fill('input[placeholder*="GENERAL"], input[placeholder*="TROLLY"]', 'TROLLY');

    // Submit
    await page.getByRole('button', { name: /Save Asset/i }).click();

    // Expect inline error banner
    await expect(page.getByText(/Asset ID "TL-001" already exists/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(artifactDir, 'proof_tools_duplicate_error_banner.png') });
  });

  test('3. Successfully adds new tool asset and shows in table', async ({ page }) => {
    await page.goto('/staff/tools');
    await page.getByRole('button', { name: /Add Tool/i }).click();

    await expect(page.getByText(/Add New Asset/i)).toBeVisible();

    // Fill with unique tool details
    await page.fill('input[placeholder*="Jackhammer"], input[placeholder*="2 Wheel"]', '2-Wheel Heavy Trolly');
    await page.fill('input[placeholder*="TL-001"], input[placeholder*="TL-007"]', 'TL-TR-99');
    await page.fill('input[placeholder*="GENERAL"], input[placeholder*="TROLLY"]', 'TROLLY');
    await page.fill('input[type="number"]:below(:text("Total Stock Owned"))', '5');
    await page.fill('input[type="number"]:below(:text("1-Day Rental Rate"))', '100');

    // Save Asset
    await page.getByRole('button', { name: /Save Asset/i }).click();

    // After success, page reloads and tool is displayed in table
    await expect(page.getByText('2-Wheel Heavy Trolly')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('TL-TR-99')).toBeVisible();

    await page.screenshot({ path: path.join(artifactDir, 'proof_tools_added_success.png'), fullPage: true });
  });
});
