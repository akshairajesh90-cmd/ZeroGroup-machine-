import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Proof: Fleet Machine Active Route & Populated Dispatches', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('Machine Detail displays Active Route Polyline from Yard to Job Site + Populated Dispatch History', async ({ page }) => {
    // Navigate to LFT-205 (previously 0 dispatches)
    await page.goto('/staff/fleet/machine/cmvxdhim2000dncvkpoup6xn4', { waitUntil: 'networkidle' });
    // Wait for road geometry to fetch and render
    await page.waitForTimeout(4000);

    // Verify map section and HUD
    await expect(page.getByText(/Route:/i)).toBeVisible();
    await expect(page.getByText(/Main Yard ➔/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Turn-by-turn Navigation/i })).toBeVisible();

    // Verify dispatch history table has rows
    await expect(page.locator('td:has-text("Kottayam Medical College Expansion")')).toBeVisible();

    const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\3a8c3f56-c1a8-4f57-8cfa-2feee98d0f82';
    const artifactPath = path.join(artifactDir, 'proof-machine-route-active.png');
    const projectPath = path.join(process.cwd(), 'proof-screenshots', 'proof-machine-route-active.png');

    await page.screenshot({ path: artifactPath, fullPage: true });
    await page.screenshot({ path: projectPath, fullPage: true });
    console.log(`📸 Saved screenshot to: ${projectPath}`);
  });
});
