import { test, expect } from '@playwright/test';
import { hash } from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';
import { Role } from '@prisma/client';
import path from 'path';
import fs from 'fs';

test.describe.configure({ mode: 'serial' });

test.describe('Operator PWA Simulation', () => {
  let operatorUser: any;
  let uid: string;
  let customer: any;
  let machine: any;
  let dispatch: any;

  test.beforeAll(async () => {
    const passwordHash = await hash('password123', 10);
    uid = crypto.randomUUID().substring(0, 8);

    // 1. Create an Operator employee & user
    operatorUser = await prisma.user.create({
      data: {
        email: `operator_${uid}@zerogroup.in`,
        hashedPassword: passwordHash,
        role: Role.OPERATOR,
        employee: {
          create: { name: `Test Operator ${uid}`, role: Role.OPERATOR, phone: `888000${uid}`.substring(0, 10) }
        }
      },
      include: { employee: true }
    });

    // Create a Machine
    machine = await prisma.machine.create({
      data: {
        machineId: `MIX-OP-${uid}`,
        type: 'MIXER',
        status: 'AVAILABLE',
        operatorDailyPayout: 1000
      }
    });

    // 3. Create a Customer
    customer = await prisma.customer.create({
      data: { name: `Customer OP ${uid}`, phone: '555-1111', address: `456 Operator St` }
    });

    // 4. Create a DailyDispatch
    dispatch = await prisma.dailyDispatch.create({
      data: {
        customerId: customer.id,
        dateOfService: new Date(),
        status: 'IN_PROGRESS',
        location: `Site OP ${uid}`,
        operatorId: operatorUser.employee!.id,
        machineId: machine.id,
      }
    });
    
    // Create dummy image file for uploads
    fs.writeFileSync('test-image.jpg', Buffer.from('dummy image data'));
  });
  
  test.afterAll(() => {
    if (fs.existsSync('test-image.jpg')) {
      fs.unlinkSync('test-image.jpg');
    }
  });

  test('operator workflow simulation', async ({ page }) => {
    // Navigate to login
    await page.goto('/');

    // Select Driver tab (Operator logs in through the same app)
    await page.click('button:has-text("Field / Driver App")');

    // Login as operator
    await page.fill('input[name="email"]', operatorUser.email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /operator/home
    try {
      await page.waitForURL('**/operator/home', { timeout: 10000 });
    } catch (e) {
      console.log('Login did not redirect, trying manual goto');
      await page.goto('/operator/home');
    }

    // Verify Active Assignment
    await expect(page.locator(`text=${machine.machineId}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${customer.name}`)).toBeVisible();

    // 1. Complete PreStartChecklist
    await page.click('button:has-text("PASS") >> nth=0'); // Hydraulics
    await page.click('button:has-text("PASS") >> nth=1'); // Outriggers
    await page.click('button:has-text("PASS") >> nth=2'); // Emergency Stop
    await page.click('button:has-text("PASS") >> nth=3'); // Leaks

    await page.click('button:has-text("Unlock Machine")');
    await expect(page.locator('text=Machine Authorized')).toBeVisible();

    // 2. Submit Docket
    // Fill Hour Meters
    await page.fill('input[placeholder="0.0"] >> nth=0', '100'); // Start Meter
    const fileInputs = await page.locator('input[type="file"]').all();
    await fileInputs[0].setInputFiles('test-image.jpg'); // Start Meter Photo
    
    await page.fill('input[placeholder="0.0"] >> nth=1', '105'); // End Meter
    await fileInputs[1].setInputFiles('test-image.jpg'); // End Meter Photo

    // Fill Concrete & Washout
    // Assuming 0 initially, waterAdded step is 5. We'll skip steppers and just swipe if we can, or click plus.
    await page.click('div:has-text("Water Added") >> button:has(svg.lucide-plus)');
    await page.click('div:has-text("Washout Time") >> button:has(svg.lucide-plus)');
    await page.click('div:has-text("Standby Time") >> button:has(svg.lucide-plus)');

    // Proof of Work
    await page.fill('input[placeholder="Client Printed Name"]', 'John Doe');
    await fileInputs[2].setInputFiles('test-image.jpg'); // Docket Photo

    // Swipe to Submit - simulate mouse drag
    const track = page.locator('div:has-text("Swipe to Sync Docket")').last();
    const trackBox = await track.boundingBox();
    if (trackBox) {
      await page.mouse.move(trackBox.x + 20, trackBox.y + trackBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(trackBox.x + trackBox.width - 20, trackBox.y + trackBox.height / 2, { steps: 5 });
      await page.mouse.up();
    }
    
    await expect(page.locator('text=Docket Synced! ✓')).toBeVisible({ timeout: 10000 });

    // 3. /operator/equipment: Submit Fluid Log and Breakdown
    await page.goto(`/operator/equipment?machineId=${machine.machineId}`);
    
    // Log Fluid
    await page.fill('input[placeholder="Amount (Liters)"]', '50');
    await page.click('button:has-text("Diesel")');
    await expect(page.locator('text=Fluid logged successfully!')).toBeVisible({ timeout: 10000 });

    // Report Breakdown
    await page.fill('textarea[placeholder="Describe the issue in detail..."]', 'Engine making a weird noise');
    await page.click('button:has-text("Report Breakdown")');
    await expect(page.locator('text=Ticket created successfully.')).toBeVisible({ timeout: 10000 });
  });
});
