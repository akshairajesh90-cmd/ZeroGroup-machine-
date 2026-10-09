import { test, expect } from '@playwright/test';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';
import { Role } from '@prisma/client';

test.describe('Driver PWA Simulation', () => {
  let driverUser: any;
  let driverPasswordHash: string;
  let uid: string;
  let customer: any;
  let machine: any;
  let vehicle: any;
  let dispatch: any;

  test.beforeAll(async () => {
    driverPasswordHash = await hash('password123', 10);
    uid = crypto.randomUUID().substring(0, 8);

    // 1. Create a Driver employee & user
    driverUser = await prisma.user.create({
      data: {
        email: `driver_${uid}@zerogroup.in`,
        hashedPassword: driverPasswordHash,
        role: Role.DRIVER,
        employee: {
          create: { name: `Test Driver ${uid}`, role: Role.DRIVER, phone: `999000${uid}`.substring(0, 10) }
        }
      },
      include: { employee: true }
    });

    // 2. Create a Vehicle
    vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: `TRK-${uid}`,
        type: 'Truck',
        status: 'AVAILABLE'
      }
    });

    // Create a Machine
    machine = await prisma.machine.create({
      data: {
        machineId: `MIX-${uid}`,
        type: 'MIXER',
        status: 'AVAILABLE',
        operatorDailyPayout: 1000
      }
    });

    // 3. Create a Customer
    customer = await prisma.customer.create({
      data: { name: `Customer ${uid}`, phone: '555-0000', address: `123 Main St` }
    });

    // 4. Create a DailyDispatch
    dispatch = await prisma.dailyDispatch.create({
      data: {
        customerId: customer.id,
        dateOfService: new Date(),
        status: 'PENDING',
        location: `Site ${uid}`,
        driverId: driverUser.employee!.id,
        machineId: machine.id,
      }
    });
  });

  test.afterAll(async () => {
    console.log('Tearing down driver simulation data...');
    await prisma.fuelLog.deleteMany({ where: { vehicleId: vehicle.id } });
    if (driverUser?.employee?.id) {
      await prisma.shiftLog.deleteMany({ where: { driverId: driverUser.employee.id } });
    }
    await prisma.dailyDispatch.deleteMany({ where: { location: `Site ${uid}` } });
    await prisma.machine.deleteMany({ where: { machineId: `MIX-${uid}` } });
    await prisma.vehicle.deleteMany({ where: { licensePlate: `TRK-${uid}` } });
    if (driverUser?.employee?.id) {
      await prisma.employee.deleteMany({ where: { id: driverUser.employee.id } });
    }
    await prisma.customer.deleteMany({ where: { name: `Customer ${uid}` } });
    await prisma.user.deleteMany({ where: { email: `driver_${uid}@zerogroup.in` } });
    console.log('Driver simulation teardown complete.');
  });

  test('driver workflow simulation', async ({ page }) => {
    // Navigate to login
    await page.goto('/');

    // Select Driver tab
    await page.click('button:has-text("Field / Driver App")');

    // Login as driver
    await page.fill('input[name="email"]', driverUser.email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /driver/home or just check navigation
    try {
      await page.waitForURL('**/driver/home', { timeout: 5000 });
    } catch (e) {
      console.log('Login did not redirect, trying manual goto');
      await page.goto('/driver/home');
    }

    // 1. /driver/home: Log shift start
    // There should be a vehicle select
    await page.selectOption('select', { label: `${vehicle.licensePlate} (${vehicle.type})` });
    
    // Click "CLOCK IN & START SHIFT"
    await page.click('button:has-text("CLOCK IN & START SHIFT")');
    // Verify shift active
    await expect(page.locator('text=Shift Active')).toBeVisible({ timeout: 10000 });

    // 2. /driver/dispatches: Accept dispatch, start trip, mark as delivered
    // Navigate via the direct link
    await page.goto('/driver/dispatches');
    // Wait for the dispatch to be visible
    await expect(page.locator(`text=Site ${uid}`)).toBeVisible();
    
    // Click the dispatch card to go to detail
    await page.click(`text=Site ${uid}`);
    await page.waitForURL(`**/driver/orders/${dispatch.id}`, { timeout: 10000 });

    // Accept dispatch
    await page.click('button:has-text("Accept Job & Prepare")');
    // Wait for state change to ACCEPTED
    await expect(page.locator('text=ACCEPTED')).toBeVisible();

    // Start trip
    await page.click('button:has-text("Start Journey / En Route")');
    // Wait for state change to EN_ROUTE
    await expect(page.locator('text=EN_ROUTE')).toBeVisible();

    // Pre-flight safety checklist
    await page.click('text=Engine Oil & Water Coolant Level Verified');
    await page.click('text=Tire Pressure & Emergency Brakes Functional');
    await page.click('text=Auxiliary Vibrator / Hose Connections Secured');
    await page.click('text=Customer On-Site Verified Equipment Delivery');

    // Confirm Delivered
    await page.click('button:has-text("Confirm Checklist & Mark DELIVERED On-Site")');
    // Wait for state change to DELIVERED
    // Wait for state change to DELIVERED
    await expect(page.locator('text=DELIVERED')).toBeVisible();

    // 3. /driver/cash & /driver/expenses: Log on-road expenses
    await page.goto('/driver/expenses');
    await expect(page.locator('text=Log Fuel / Expense')).toBeVisible();

    // Log vehicle fuel
    await page.click('button:has-text("🚛 Vehicle")');
    await page.selectOption('select[name="vehicleId"]', vehicle.id);
    await page.fill('input[name="liters"]', '50');
    await page.fill('input[name="totalCost"]', '4500');
    await page.fill('input[name="odometer"]', '12000');
    await page.click('button:has-text("Save Fuel Log")');

    await expect(page.locator('text=Fuel log saved successfully!')).toBeVisible();
  });
});
