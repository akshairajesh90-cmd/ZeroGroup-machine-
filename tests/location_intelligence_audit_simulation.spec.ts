import { test, expect } from '@playwright/test';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';

test.describe('Location Intelligence Audit & Field Simulation', () => {
  test.use({ storageState: 'playwright/.auth/driver.json' });

  let uid: string;
  let customer: any;
  let vehicle: any;
  let dispatch: any;

  test.beforeAll(async () => {
    uid = crypto.randomUUID().substring(0, 8);

    // 1. Find existing seeded Driver
    const driverUser = await prisma.user.findFirst({
      where: { email: 'driver@zerogroup.com' },
      include: { employee: true }
    });

    if (!driverUser || !driverUser.employee) {
      throw new Error("Seeded driver employee not found in database.");
    }

    // 2. Create a Vehicle
    vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: `KL-35-${uid}`.substring(0, 10),
        type: 'Flatbed Carrier',
        status: 'AVAILABLE'
      }
    });

    // 3. Create a Customer
    customer = await prisma.customer.create({
      data: { name: `Estate Client ${uid}`, phone: '9847000111', address: 'Teekoy Rubber Estate' }
    });

    // 4. Create a DailyDispatch with coordinates near Erattupetta / Teekoy
    dispatch = await prisma.dailyDispatch.create({
      data: {
        customerId: customer.id,
        dateOfService: new Date(),
        status: 'EN_ROUTE',
        location: `Rubber Estate Block 4, Teekoy`,
        latitude: 9.6950,
        longitude: 76.7850,
        driverId: driverUser.employee.id,
        vehicleId: vehicle.id,
        locationSource: 'STAFF_BOOKING',
      }
    });
  });

  test.afterAll(async () => {
    console.log('Tearing down location audit simulation data...');
    if (dispatch?.id) {
      await prisma.locationPing.deleteMany({ where: { dispatchId: dispatch.id } });
      await prisma.dailyDispatch.deleteMany({ where: { id: dispatch.id } });
    }
    if (vehicle?.id) {
      await prisma.vehicle.deleteMany({ where: { id: vehicle.id } });
    }
    if (customer?.id) {
      await prisma.customer.deleteMany({ where: { id: customer.id } });
    }
    console.log('Location audit simulation teardown complete.');
  });

  test('Driver mobile order view renders screen-on guidance, Malayalam sub-labels, and fuel audit modal', async ({ page }) => {
    // Set mobile viewport (typical field smartphone in sunlight)
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Direct navigation with pre-authenticated storageState
    await page.goto(`/driver/orders/${dispatch.id}`);
    await page.waitForLoadState('domcontentloaded');

    // 2. Verify Screen Wake Lock guidance banner is visible for EN_ROUTE
    const wakeBanner = page.locator('text=Keep Screen On While Driving');
    await expect(wakeBanner).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Background GPS pauses when your screen locks')).toBeVisible();

    // 3. Verify Malayalam sub-labels on driver buttons (Rule 8)
    await expect(page.locator('text=സൈറ്റ് ലൊക്കേഷൻ')).toBeVisible();
    await expect(page.locator('text=വഴി അറിയാൻ')).toBeVisible();
    await expect(page.locator('text=സൈറ്റിലേക്ക് ജി.പി.എസ് അയക്കുക')).toBeVisible();

    // 4. Open Site Pin Modal by clicking Inspect GPS Pin
    const pinBtn = page.locator('button:has-text("Inspect GPS Pin")');
    await pinBtn.click();

    // 5. Verify Site Location & GPS Pin Modal opens with fuel audit details
    await expect(page.locator('h3:has-text("Site Location & GPS Pin")')).toBeVisible();
    await expect(page.locator('text=Haulage Est (Pala):')).toBeVisible();
    await expect(page.locator('text=diesel')).toBeVisible();
  });
});
