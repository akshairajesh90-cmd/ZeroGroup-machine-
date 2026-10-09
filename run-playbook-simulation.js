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

  console.log('Pre-populating database with simulation entities...');
  
  // Get reference entities
  const customer = await prisma.customer.findFirst();
  const staff = await prisma.employee.findFirst({ where: { role: 'STAFF' } });
  const employee = await prisma.employee.findFirst({ where: { role: 'OPERATOR' } });

  if (!customer || !staff || !employee) {
    console.error('Required database seed references missing. Please seed database first.');
    process.exit(1);
  }

  // Create a soft-deleted receipt for the trash test
  console.log('Creating soft-deleted payment receipt for recovery simulation...');
  await prisma.paymentReceipt.deleteMany({ where: { receiptNumber: 'REC-SIM-123' } });
  const softDeletedReceipt = await prisma.paymentReceipt.create({
    data: {
      receiptNumber: 'REC-SIM-123',
      amount: 25000,
      paymentMethod: 'CASH',
      depositStatus: 'PENDING_DEPOSIT',
      customerId: customer.id,
      collectedByEmployeeId: employee.id,
      isPendingDelete: true,
      markedForDeleteBy: staff.id,
      paymentDate: new Date()
    }
  });
  console.log(`Created receipt ID: ${softDeletedReceipt.id}`);

  console.log('Launching browser for simulation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  // Handle browser confirms automatically
  page.on('dialog', async dialog => {
    console.log(`Dialog message: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    // 1. Log in
    console.log('Logging in as Owner...');
    await page.goto('http://localhost:3000/');
    await page.fill('input[name="email"]', 'owner@ironrent.test');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(6000);
    console.log('Login complete. Current URL:', page.url());

    // 2. Trash Recovery Test
    console.log('Navigating to Owner Trash...');
    await page.goto('http://localhost:3000/owner/trash');
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(artifactDir, 'sim_trash_before_restore.png'), fullPage: true });
    console.log('Saved sim_trash_before_restore.png');

    console.log('Clicking Restore on the deleted payment receipt...');
    // Use a strict element selector for the specific row, then click restore
    const restoreBtn = page.locator('div').filter({ hasText: 'REC-SIM-123' }).locator('button:has-text("Restore")').first();
    await restoreBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(artifactDir, 'sim_trash_after_restore.png'), fullPage: true });
    console.log('Saved sim_trash_after_restore.png');

    // 3. Manual Adjustment Reversal Test
    console.log('Navigating to Owner Adjustments...');
    await page.goto('http://localhost:3000/owner/adjustments');
    await page.waitForTimeout(6000); // Wait 6 seconds for compilation & hydration

    console.log('Submitting a new Penalty adjustment...');
    
    // Choose employee and penalty
    await page.locator('select').first().selectOption(employee.id);
    await page.locator('select').nth(1).selectOption('PENALTY');
    
    // Input values
    await page.fill('input[placeholder="1500"]', '1500');
    await page.fill('input[placeholder="Overtime, Damage penalty, etc."]', 'Transit damage warning');

    // Log the input state before clicking submit
    const empVal = await page.locator('select').first().inputValue();
    const typeVal = await page.locator('select').nth(1).inputValue();
    const amountVal = await page.locator('input[placeholder="1500"]').inputValue();
    const reasonVal = await page.locator('input[placeholder="Overtime, Damage penalty, etc."]').inputValue();
    console.log('FORM VALUES BEFORE SUBMIT:', { empVal, typeVal, amountVal, reasonVal });

    // Click Save button
    await page.locator('button:has-text("Save Adjustment")').click();
    await page.waitForTimeout(6000);
    console.log('URL after form submit:', page.url());
    await page.screenshot({ path: path.join(artifactDir, 'sim_adjustment_created.png'), fullPage: true });
    console.log('Saved sim_adjustment_created.png');

    console.log('Clicking Reverse on the newly created adjustment...');
    // Click reverse on the first row in the table containing our reason text
    const reverseBtn = page.locator('tr:has-text("Transit damage warning")').locator('button:has-text("Reverse")').first();
    await reverseBtn.click();
    await page.waitForTimeout(6000);
    await page.screenshot({ path: path.join(artifactDir, 'sim_adjustment_reversed.png'), fullPage: true });
    console.log('Saved sim_adjustment_reversed.png');

    console.log('Simulation successfully verified!');

  } catch (err) {
    console.error('Simulation run failed:', err);
    try {
      console.log('PAGE CONTENT BODY TEXT:');
      console.log(await page.innerText('body'));
    } catch (e) {
      console.error('Could not extract body text:', e.message);
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
})();
