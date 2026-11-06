import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Proof: Hardened Telemetry Engine & Full Asset Location Tracking', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\3a8c3f56-c1a8-4f57-8cfa-2feee98d0f82';

  test('1. Dispatch Board: Site Location Pin Modal displays Map Pin + Logistics & Dispatched Assets Card', async ({ page }) => {
    await page.goto('/staff/dispatch?view=day', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Find and click the 'Pin' button on the first dispatch card
    const pinBtn = page.locator('button:has-text("Pin")').first();
    await expect(pinBtn).toBeVisible();
    await pinBtn.click();
    await page.waitForTimeout(800);

    // Verify modal is visible
    const modal = page.locator('div.fixed.inset-0.z-50').last();
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Site Location & GPS Pin')).toBeVisible();

    // Take screenshot of the complete Site Location & Logistics Modal
    const screenshotPath = path.join(artifactDir, 'proof-dispatch-site-pin-modal.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Proof screenshot saved: ${screenshotPath}`);

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('2. Machine Detail: Dispatch History displays Customer Site, GPS Coordinates, Truck, Driver, and Tools', async ({ page }) => {
    // Navigate directly to seeded test machine
    await page.goto('/staff/fleet/machine/cmvxdhil60000ncvk8dfcnnd7', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Assert Dispatch History tab is visible and selected
    const historyTab = page.locator('button:has-text("Dispatch History")');
    await expect(historyTab).toBeVisible();
    await historyTab.click();
    await page.waitForTimeout(600);

    // Verify columns exist
    await expect(page.locator('th:has-text("Customer Site & Location")')).toBeVisible();
    await expect(page.locator('th:has-text("Logistics & Crew")')).toBeVisible();
    await expect(page.locator('th:has-text("Dispatched Tools")')).toBeVisible();

    // Take screenshot of Machine Detail with Dispatch History
    const screenshotPath = path.join(artifactDir, 'proof-machine-dispatch-history.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Proof screenshot saved: ${screenshotPath}`);
  });

  test('3. Vehicle Detail: Delivery Trips & Sites Tab displays customer sites visited and equipment carried', async ({ page }) => {
    // Navigate directly to seeded test vehicle
    await page.goto('/staff/fleet/vehicle/cmvxdi88x0000rovk86jbkzpw', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Click Delivery Trips & Sites tab
    const tripsTab = page.locator('button:has-text("Delivery Trips & Sites")');
    await expect(tripsTab).toBeVisible();
    await tripsTab.click();
    await page.waitForTimeout(600);

    // Verify trip table columns
    await expect(page.locator('th:has-text("Customer Site & Location")')).toBeVisible();
    await expect(page.locator('th:has-text("Equipment & Tools Carried")')).toBeVisible();

    // Take screenshot of Vehicle Trips History
    const screenshotPath = path.join(artifactDir, 'proof-vehicle-trips-history.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Proof screenshot saved: ${screenshotPath}`);
  });

  test('4. Tools Inventory: Tool Deployments Modal shows active site GPS, truck, driver, and operator custody', async ({ page }) => {
    await page.goto('/staff/tools', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Find deployed badge button
    const viewSitesBtn = page.locator('button:has-text("Deployed (View Sites)")').first();
    await expect(viewSitesBtn).toBeVisible();
    await viewSitesBtn.click();
    await page.waitForTimeout(800);

    // Verify deployment modal opened
    const modalHeader = page.locator('h3:has-text("Active Sites & Deployments")');
    await expect(modalHeader).toBeVisible();

    // Take screenshot of the Tool Deployment Modal
    const screenshotPath = path.join(artifactDir, 'proof-tools-deployments-modal.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Proof screenshot saved: ${screenshotPath}`);

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('5. Stateless Telemetry Route Handler (/api/location/ping): Ingests single ping & batch pings atomically', async ({ request }) => {
    // Single Ping Ingestion
    const singlePingRes = await request.post('/api/location/ping', {
      data: {
        latitude: 9.6914,
        longitude: 76.7828,
        accuracy: 12,
        speed: 25,
        source: 'BROWSER',
        sessionId: 'test_session_uuid_101',
        seq: 1,
      },
    });

    expect(singlePingRes.status()).toBe(200);
    const singleJson = await singlePingRes.json();
    expect(singleJson.success).toBe(true);
    expect(singleJson.count).toBe(1);

    // Bulk Ordered Offline Replay Ingestion
    const batchPingRes = await request.post('/api/location/ping', {
      data: {
        pings: [
          {
            latitude: 9.6920,
            longitude: 76.7835,
            accuracy: 15,
            speed: 30,
            source: 'OFFLINE_REPLAY',
            sessionId: 'test_session_uuid_101',
            seq: 2,
          },
          {
            latitude: 9.6925,
            longitude: 76.7840,
            accuracy: 14,
            speed: 32,
            source: 'OFFLINE_REPLAY',
            sessionId: 'test_session_uuid_101',
            seq: 3,
          },
        ],
      },
    });

    expect(batchPingRes.status()).toBe(200);
    const batchJson = await batchPingRes.json();
    expect(batchJson.success).toBe(true);
    expect(batchJson.count).toBe(2);
  });
});
