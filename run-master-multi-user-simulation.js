const { chromium } = require('@playwright/test');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

(async () => {
  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\086f0c0f-7eea-4ce2-91b4-8cadf65d1df1';
  
  if (!fs.existsSync(artifactDir)){
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('--- STARTING MASTER MULTI-USER SIMULATION ---');

  try {
    // 1. DATABASE PREPARATION PHASE
    console.log('[Prep] Querying/preparing simulation entities...');
    const customer = await prisma.customer.findFirst();
    const driver = await prisma.employee.findFirst({ where: { role: 'DRIVER' } });
    const operator = await prisma.employee.findFirst({ where: { role: 'OPERATOR' } });
    const staff = await prisma.employee.findFirst({ where: { role: 'STAFF' } });

    if (!customer || !driver || !operator || !staff) {
      console.error('Missing seed employees or customers in database!');
      process.exit(1);
    }

    // Ensure machines exist in the database
    let machine = await prisma.machine.findFirst({ where: { machineId: 'MIX-SIM-101' } });
    if (!machine) {
      console.log('[Prep] Creating primary machine MIX-SIM-101...');
      machine = await prisma.machine.create({
        data: {
          machineId: 'MIX-SIM-101',
          type: 'MIXER',
          status: 'AVAILABLE',
          operatorDailyPayout: 1500
        }
      });
    }

    let replacementMachine = await prisma.machine.findFirst({ where: { machineId: 'MIX-REP-999' } });
    if (!replacementMachine) {
      console.log('[Prep] Creating replacement machine MIX-REP-999...');
      replacementMachine = await prisma.machine.create({
        data: {
          machineId: 'MIX-REP-999',
          type: 'MIXER',
          status: 'AVAILABLE',
          operatorDailyPayout: 1200
        }
      });
    }

    // Set today's date of service
    const today = new Date();
    today.setHours(12, 0, 0, 0); // avoid timezones issues

    // Clean up daily dispatches for today
    await prisma.dailyDispatch.deleteMany({
      where: {
        dateOfService: today,
        customerId: customer.id
      }
    });

    // Create a new daily dispatch for today
    console.log('[Prep] Creating daily dispatch for today...');
    const dispatch = await prisma.dailyDispatch.create({
      data: {
        customerId: customer.id,
        driverId: driver.id,
        operatorId: operator.id,
        machineId: machine.id,
        location: 'Site Alpha - Pala Road',
        dateOfService: today,
        status: 'ACCEPTED', 
        operatorDailyRate: 1500,
        customerCharge: 3500,
        notes: 'Urgent concrete pouring'
      }
    });
    console.log(`Created dispatch: ${dispatch.id}`);

    // Create a soft-deleted receipt for recovery
    await prisma.paymentReceipt.deleteMany({ where: { receiptNumber: 'REC-MASTER-999' } });
    const deletedReceipt = await prisma.paymentReceipt.create({
      data: {
        receiptNumber: 'REC-MASTER-999',
        amount: 35000,
        paymentMethod: 'CASH',
        depositStatus: 'PENDING_DEPOSIT',
        customerId: customer.id,
        collectedByEmployeeId: operator.id,
        isPendingDelete: true,
        markedForDeleteBy: staff.id,
        paymentDate: new Date()
      }
    });

    console.log('Database preparation complete.');

    // 2. BROWSER LAUNCH
    const browser = await chromium.launch({ headless: true });
    
    const setupPageHandlers = (page, name) => {
      page.on('console', msg => console.log(`[${name} CONSOLE]`, msg.text()));
      page.on('dialog', async dialog => {
        console.log(`[${name} DIALOG]`, dialog.message());
        await dialog.accept();
      });
    };

    // PHASE 1: DRIVER PORTAL TRIP VERIFICATION
    console.log('\n--- PHASE 1: DRIVER PORTAL TRANSPORT ---');
    const driverContext = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true });
    const driverPage = await driverContext.newPage();
    setupPageHandlers(driverPage, 'Driver');

    console.log('Driver logging in...');
    await driverPage.goto('http://localhost:3000/');
    await driverPage.fill('input[name="email"]', 'driver@ironrent.test');
    await driverPage.fill('input[name="password"]', 'password123');
    await driverPage.click('button[type="submit"]');
    await driverPage.waitForTimeout(6000);

    console.log('Driver dashboard location:', driverPage.url());
    await driverPage.screenshot({ path: path.join(artifactDir, 'sim_master_1_driver_portal.png') });
    console.log('Saved sim_master_1_driver_portal.png');
    await driverContext.close();

    // PHASE 2: STAFF PORTAL INCIDENT RESPONSE (BREAKDOWN & HOT-SWAP)
    console.log('\n--- PHASE 2: STAFF PORTAL INCIDENT (SWAP) ---');
    const staffContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const staffPage = await staffContext.newPage();
    setupPageHandlers(staffPage, 'Staff');

    console.log('Staff logging in...');
    await staffPage.goto('http://localhost:3000/');
    await staffPage.fill('input[name="email"]', 'staff@ironrent.test');
    await staffPage.fill('input[name="password"]', 'password123');
    await staffPage.click('button[type="submit"]');
    await staffPage.waitForTimeout(6000);

    console.log('Navigating to Dispatch Board...');
    await staffPage.goto('http://localhost:3000/staff/dispatch');
    await staffPage.waitForTimeout(4000);

    await staffPage.screenshot({ path: path.join(artifactDir, 'sim_master_2_staff_dispatch.png'), fullPage: true });
    console.log('Saved sim_master_2_staff_dispatch.png');
    await staffContext.close();

    // PHASE 3: OPERATOR PORTAL DIARY & ADVANCE REQUEST
    console.log('\n--- PHASE 3: OPERATOR PORTAL DIARY ---');
    const operatorContext = await browser.newContext({ viewport: { width: 420, height: 900 }, isMobile: true });
    const operatorPage = await operatorContext.newPage();
    setupPageHandlers(operatorPage, 'Operator');

    console.log('Operator logging in...');
    await operatorPage.goto('http://localhost:3000/');
    await operatorPage.fill('input[name="email"]', 'operator@ironrent.test');
    await operatorPage.fill('input[name="password"]', 'password123');
    await operatorPage.click('button[type="submit"]');
    await operatorPage.waitForTimeout(6000);

    console.log('Operator dashboard location:', operatorPage.url());
    
    await operatorPage.screenshot({ path: path.join(artifactDir, 'sim_master_3_operator_portal.png') });
    console.log('Saved sim_master_3_operator_portal.png');
    await operatorContext.close();

    // PHASE 4: STAFF PORTAL CASH DISCREPANCIES
    console.log('\n--- PHASE 4: STAFF PORTAL CASH ---');
    const cashContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const cashPage = await cashContext.newPage();
    setupPageHandlers(cashPage, 'StaffCash');

    console.log('Staff logging in...');
    await cashPage.goto('http://localhost:3000/');
    await cashPage.fill('input[name="email"]', 'staff@ironrent.test');
    await cashPage.fill('input[name="password"]', 'password123');
    await cashPage.click('button[type="submit"]');
    await cashPage.waitForTimeout(6000);

    console.log('Navigating to Cash Dashboard...');
    await cashPage.goto('http://localhost:3000/staff/cash');
    await cashPage.waitForTimeout(4000);

    await cashPage.screenshot({ path: path.join(artifactDir, 'sim_master_4_staff_cash.png'), fullPage: true });
    console.log('Saved sim_master_4_staff_cash.png');
    await cashContext.close();

    // PHASE 5: OWNER PORTAL FORENSICS (TRASH RECOVERY & MANUAL REVERSAL)
    console.log('\n--- PHASE 5: OWNER PORTAL FORENSICS ---');
    const ownerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const ownerPage = await ownerContext.newPage();
    setupPageHandlers(ownerPage, 'Owner');

    console.log('Owner logging in...');
    await ownerPage.goto('http://localhost:3000/');
    await ownerPage.fill('input[name="email"]', 'owner@ironrent.test');
    await ownerPage.fill('input[name="password"]', 'password123');
    await ownerPage.click('button[type="submit"]');
    await ownerPage.waitForTimeout(6000);

    // A. Trash Recovery
    console.log('Navigating to Owner Trash...');
    await ownerPage.goto('http://localhost:3000/owner/trash');
    await ownerPage.waitForTimeout(4000);
    await ownerPage.screenshot({ path: path.join(artifactDir, 'sim_master_5_owner_trash.png'), fullPage: true });
    console.log('Saved sim_master_5_owner_trash.png');

    console.log('Restoring receipt REC-MASTER-999...');
    const restoreBtn = ownerPage.locator('div').filter({ hasText: 'REC-MASTER-999' }).locator('button:has-text("Restore")').first();
    await restoreBtn.click();
    await ownerPage.waitForTimeout(4000);

    // B. Manual Adjustments Reversals
    console.log('Navigating to Owner Adjustments...');
    await ownerPage.goto('http://localhost:3000/owner/adjustments');
    await ownerPage.waitForTimeout(6000);

    console.log('Creating a new Penalty adjustment...');
    await ownerPage.locator('select').first().selectOption(operator.id);
    await ownerPage.locator('select').nth(1).selectOption('PENALTY');
    await ownerPage.fill('input[placeholder="1500"]', '2500');
    await ownerPage.fill('input[placeholder="Overtime, Damage penalty, etc."]', 'Unapproved fuel drop');
    await ownerPage.locator('button:has-text("Save Adjustment")').click();
    await ownerPage.waitForTimeout(6000);
    await ownerPage.screenshot({ path: path.join(artifactDir, 'sim_master_6_owner_adjustment_created.png'), fullPage: true });
    console.log('Saved sim_master_6_owner_adjustment_created.png');

    console.log('Reversing the newly created adjustment...');
    const reverseBtn = ownerPage.locator('tr:has-text("Unapproved fuel drop")').locator('button:has-text("Reverse")').first();
    await reverseBtn.click();
    await ownerPage.waitForTimeout(6000);
    await ownerPage.screenshot({ path: path.join(artifactDir, 'sim_master_7_owner_adjustment_reversed.png'), fullPage: true });
    console.log('Saved sim_master_7_owner_adjustment_reversed.png');

    await ownerContext.close();
    await browser.close();

    console.log('\n--- MASTER SIMULATION COMPLETE ---');

  } catch (error) {
    console.error('Master simulation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
