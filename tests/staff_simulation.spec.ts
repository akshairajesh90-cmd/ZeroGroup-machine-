import { test, expect, Page } from '@playwright/test';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';
import dotenv from 'dotenv';
dotenv.config();

let staffUser: any;
let staffEmployee: any;
let customer: any;
let machine: any;
let dispatch: any;

const PIN = "1234";
let hashedPin: string;

test.beforeAll(async () => {
  console.log("Cleaning up previous failed test data (if any)...");
  await prisma.dispatchStatusHistory.deleteMany({ where: { dispatch: { location: 'Staff Simulation Site' } } });
  await prisma.dailyDispatch.deleteMany({ where: { location: 'Staff Simulation Site' } });
  await prisma.employee.deleteMany({ where: { user: { email: 'staff_sim@ironrent.local' } } });
  await prisma.user.deleteMany({ where: { email: 'staff_sim@ironrent.local' } });
  await prisma.customer.deleteMany({ where: { name: 'Sim Customer' } });
  await prisma.machine.deleteMany({ where: { machineId: 'SIM-MIX-01' } });

  console.log("Seeding Database for Staff Simulation Test...");
  hashedPin = await bcrypt.hash(PIN, 10);
  
  customer = await prisma.customer.create({
    data: { name: 'Sim Customer', phone: '9999999999', address: '123 Sim Way' }
  });

  machine = await prisma.machine.create({
    data: { machineId: 'SIM-MIX-01', type: 'MIXER', status: 'AVAILABLE', operatorDailyPayout: 0 }
  });

  staffUser = await prisma.user.create({
    data: { email: 'staff_sim@ironrent.local', hashedPassword: hashedPin, role: Role.STAFF }
  });

  staffEmployee = await prisma.employee.create({
    data: { 
      userId: staffUser.id, 
      name: 'Staff Sim', 
      phone: '8888888888', 
      role: Role.STAFF
    }
  });

  dispatch = await prisma.dailyDispatch.create({
    data: {
      customerId: customer.id,
      machineId: machine.id,
      dateOfService: new Date(),
      status: 'PENDING',
      location: 'Staff Simulation Site',
      workType: 'NORMAL',
    }
  });
});

test.afterAll(async () => {
  console.log('Tearing down staff simulation data...');
  await prisma.dispatchStatusHistory.deleteMany({ where: { dispatch: { location: 'Staff Simulation Site' } } });
  await prisma.dailyDispatch.deleteMany({ where: { location: 'Staff Simulation Site' } });
  if (staffEmployee?.id) await prisma.employee.deleteMany({ where: { id: staffEmployee.id } });
  await prisma.user.deleteMany({ where: { email: 'staff_sim@ironrent.local' } });
  await prisma.customer.deleteMany({ where: { name: 'Sim Customer' } });
  await prisma.machine.deleteMany({ where: { machineId: 'SIM-MIX-01' } });
  console.log('Staff simulation teardown complete.');
});

async function loginUser(page: Page, email: string, pin: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', pin);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

test('Staff can postpone a dispatch before 2:00 PM next day and logs mandatory reason', async ({ page }) => {
  await loginUser(page, staffUser.email, PIN);

  await page.goto('/staff/dispatch');
  
  // Accept the prompt for the mandatory reason
  page.on('dialog', async dialog => {
    if (dialog.message().includes('Reason')) {
      await dialog.accept('Test Postpone Reason');
    } else {
      await dialog.accept();
    }
  });

  // Find the dispatch row by looking for location text
  const row = page.locator('.bg-slate-900').filter({ hasText: 'Staff Simulation Site' }).first();
  await expect(row).toBeVisible();
  
  // Hover over the status update button to reveal dropdown
  const statusUpdateBtn = row.locator('button:has-text("Update Status")');
  await statusUpdateBtn.hover();
  
  // Click Postpone Job
  const postponeBtn = row.locator('button:has-text("Postpone Job")');
  await postponeBtn.click();
  
  // Wait for the status to change to POSTPONED in the UI
  await expect(row.locator('span:has-text("POSTPONED")')).toBeVisible({ timeout: 10000 });
  
  // Verify database
  const updatedDispatch = await prisma.dailyDispatch.findUnique({ where: { id: dispatch.id } });
  expect(updatedDispatch?.status).toBe('POSTPONED');
  
  const history = await prisma.dispatchStatusHistory.findFirst({
    where: { dispatchId: dispatch.id, newStatus: 'POSTPONED' },
    orderBy: { createdAt: 'desc' }
  });
  
  expect(history).not.toBeNull();
  expect(history?.reason).toBe('Test Postpone Reason');
  expect(history?.changedById).toBe(staffEmployee.id);
});
