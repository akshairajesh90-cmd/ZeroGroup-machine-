import { test, expect } from '@playwright/test';

test.describe('Milestone 3: Geolocation Accuracy, GPS Error Preservation & Link Resolver', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('GPS Permission Denied: Preserves existing form coordinates and shows permission error', async ({ page }) => {
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Open Edit Store Location modal
    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    // Fill in pre-existing coordinates
    const latInput = modalDialog.locator('input[placeholder="e.g. 9.591600"]');
    const lngInput = modalDialog.locator('input[placeholder="e.g. 76.522200"]');
    await latInput.fill('9.591600');
    await lngInput.fill('76.522200');

    // Mock geolocation error: PERMISSION_DENIED (code: 1)
    await page.evaluate(() => {
      (navigator.geolocation as unknown as Record<string, unknown>).getCurrentPosition = (
        _success: PositionCallback,
        error?: PositionErrorCallback
      ) => {
        if (error) {
          const err = {
            code: 1,
            message: 'User denied Geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as unknown as GeolocationPositionError;
          error(err);
        }
      };
    });

    // Click 'Use Device GPS'
    const gpsBtn = modalDialog.locator('button:has-text("Use Device GPS")');
    await gpsBtn.click();
    await page.waitForTimeout(400);

    // Verify error banner is displayed
    const errorBanner = modalDialog.locator('div.text-rose-400');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Location access denied');

    // CRITICAL ASSERTION: Existing coordinates MUST NOT be cleared or wiped!
    await expect(latInput).toHaveValue('9.591600');
    await expect(lngInput).toHaveValue('76.522200');
  });

  test('GPS Timeout: Preserves existing form coordinates and displays timeout error message', async ({ page }) => {
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    // Fill in pre-existing coordinates
    const latInput = modalDialog.locator('input[placeholder="e.g. 9.591600"]');
    const lngInput = modalDialog.locator('input[placeholder="e.g. 76.522200"]');
    await latInput.fill('9.591600');
    await lngInput.fill('76.522200');

    // Mock geolocation error: TIMEOUT (code: 3)
    await page.evaluate(() => {
      (navigator.geolocation as unknown as Record<string, unknown>).getCurrentPosition = (
        _success: PositionCallback,
        error?: PositionErrorCallback
      ) => {
        if (error) {
          const err = {
            code: 3,
            message: 'GPS request timed out',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as unknown as GeolocationPositionError;
          error(err);
        }
      };
    });

    // Click 'Use Device GPS'
    const gpsBtn = modalDialog.locator('button:has-text("Use Device GPS")');
    await gpsBtn.click();
    await page.waitForTimeout(400);

    // Verify timeout error message is displayed
    const errorBanner = modalDialog.locator('div.text-rose-400');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('GPS request timed out');

    // CRITICAL ASSERTION: Existing coordinates MUST NOT be cleared or wiped!
    await expect(latInput).toHaveValue('9.591600');
    await expect(lngInput).toHaveValue('76.522200');
  });

  test('Low-Accuracy GPS (>50m): Displays accuracy radius badge and requires confirmation before filling lat/lng', async ({ page }) => {
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    const latInput = modalDialog.locator('input[placeholder="e.g. 9.591600"]');
    const lngInput = modalDialog.locator('input[placeholder="e.g. 76.522200"]');
    await latInput.fill('10.000000');
    await lngInput.fill('77.000000');

    // Mock low-accuracy GPS (accuracy: 120m > 50m threshold)
    await page.evaluate(() => {
      (navigator.geolocation as unknown as Record<string, unknown>).getCurrentPosition = (
        success: PositionCallback
      ) => {
        const pos = {
          coords: {
            latitude: 9.654321,
            longitude: 76.876543,
            accuracy: 120, // Low accuracy: 120m radius
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as unknown as GeolocationPosition;
        success(pos);
      };
    });

    // Click 'Use Device GPS'
    const gpsBtn = modalDialog.locator('button:has-text("Use Device GPS")');
    await gpsBtn.click();
    await page.waitForTimeout(400);

    // Verify low accuracy confirmation card appears with radius badge
    const confirmCard = modalDialog.locator('div:has-text("Confirmation Required")').first();
    await expect(confirmCard).toBeVisible();
    await expect(confirmCard).toContainText('Low Accuracy GPS');
    await expect(confirmCard).toContainText('120m');

    // CRITICAL ASSERTION: Lat/Lng must NOT be auto-filled until confirmed!
    await expect(latInput).toHaveValue('10.000000');
    await expect(lngInput).toHaveValue('77.000000');

    // Click explicit confirmation button
    const confirmBtn = modalDialog.locator('button:has-text("Confirm Coordinates")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await page.waitForTimeout(400);

    // Verify coordinates are now filled after confirmation
    await expect(latInput).toHaveValue('9.654321');
    await expect(lngInput).toHaveValue('76.876543');

    // Verify GPS Accuracy badge shows confirmed status
    const accuracyBadge = modalDialog.locator('text=/GPS Accuracy.*120m.*Confirmed/');
    await expect(accuracyBadge).toBeVisible();
  });

  test('High-Accuracy GPS (<=50m): Auto-fills coordinates directly and shows High Accuracy indicator', async ({ page }) => {
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    const latInput = modalDialog.locator('input[placeholder="e.g. 9.591600"]');
    const lngInput = modalDialog.locator('input[placeholder="e.g. 76.522200"]');

    // Mock high-accuracy GPS (accuracy: 12m <= 50m threshold)
    await page.evaluate(() => {
      (navigator.geolocation as unknown as Record<string, unknown>).getCurrentPosition = (
        success: PositionCallback
      ) => {
        const pos = {
          coords: {
            latitude: 9.591600,
            longitude: 76.522200,
            accuracy: 12, // High accuracy: 12m radius
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as unknown as GeolocationPosition;
        success(pos);
      };
    });

    // Click 'Use Device GPS'
    const gpsBtn = modalDialog.locator('button:has-text("Use Device GPS")');
    await gpsBtn.click();
    await page.waitForTimeout(400);

    // Verify coordinates are auto-filled directly
    await expect(latInput).toHaveValue('9.591600');
    await expect(lngInput).toHaveValue('76.522200');

    // Verify High Accuracy badge is shown and confirmation card is NOT shown
    const accuracyBadge = modalDialog.locator('text=/GPS Accuracy.*12m.*High Accuracy/');
    await expect(accuracyBadge).toBeVisible();
    await expect(modalDialog.locator('text=Confirmation Required')).not.toBeVisible();
  });

  test('Google Maps URL Parser: Auto-fills destination pin coordinates over camera viewport', async ({ page }) => {
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    const linkInput = modalDialog.locator('input[placeholder*="Paste Google Maps URL"]');
    const latInput = modalDialog.locator('input[placeholder="e.g. 9.591600"]');
    const lngInput = modalDialog.locator('input[placeholder="e.g. 76.522200"]');

    // Modern Google Maps URL having both @viewport (9.7, 76.6) and !3d..!4d.. pin (9.591600, 76.522200)
    const modernUrl =
      'https://www.google.com/maps/place/Zero+Group+Base+Yard/@9.700000,76.600000,15z/data=!4m6!3m5!1s0x3b07b30:0x123!8m2!3d9.591600!4d76.522200!16s%2Fg%2F11';

    await linkInput.fill(modernUrl);
    await page.waitForTimeout(400);

    // Verify it preferred the !3d..!4d.. pin coordinate over the camera viewport!
    await expect(latInput).toHaveValue('9.591600');
    await expect(lngInput).toHaveValue('76.522200');
  });
});
