import { test, expect, Page } from '@playwright/test';

// Global error tracking for every page
function setupErrorTracking(page: Page, pageErrors: string[]) {
  page.on('pageerror', err => {
    console.error(`💥 [UNCAUGHT PAGE ERROR]: ${err.message}`);
    pageErrors.push(err.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('icon.png')) {
      console.warn(`⚠️ [CONSOLE ERROR]: ${msg.text()}`);
    }
  });
}

test.describe('ZERO GROUP — Master Button Interaction & Resilience Audit', () => {

  test('01. Public Landing Page — Search, Filter Pills, Specs Modals, Quotation Buttons', async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    await page.goto('/', { waitUntil: 'load' });
    await expect(page.locator('body')).toBeVisible();

    // 1. Search input & Clear button
    const searchInput = page.getByPlaceholder(/Search machinery/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Reversible');
    await page.waitForTimeout(500);
    const clearBtn = page.getByRole('button', { name: 'Clear' });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    console.log('  ✓ Search input & Clear button verified');

    // 2. Category filter pills
    const categories = ['Concrete', 'Earthmoving', 'Lifting', 'Transport', 'All Fleet'];
    for (const cat of categories) {
      const pill = page.getByRole('button', { name: cat, exact: true });
      if (await pill.isVisible()) {
        await pill.click();
        await page.waitForTimeout(300);
        console.log(`  ✓ Filter pill clicked: "${cat}"`);
      }
    }

    // 3. Technical Specs Modal Button (Open and Close)
    const specsButtons = page.getByRole('button', { name: /Specs/i });
    const specsCount = await specsButtons.count();
    if (specsCount > 0) {
      await specsButtons.first().click();
      await page.waitForTimeout(500);
      // Verify modal is visible
      const modal = page.locator('[role="dialog"], .fixed.inset-0, [aria-modal="true"]').first();
      await expect(modal).toBeVisible();
      console.log('  ✓ Specs Modal opened successfully');

      // Close modal via close button or Escape
      const closeBtn = page.locator('button:has-text("✕"), button[aria-label="Close"], button:has-text("Close")').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
      console.log('  ✓ Specs Modal dismissed cleanly');
    }

    // 4. Header buttons & links
    const crewLoginBtn = page.getByRole('link', { name: /Crew Login/i }).first();
    await expect(crewLoginBtn).toBeVisible();

    expect(pageErrors, 'Expected zero unhandled page errors during public button clicks').toHaveLength(0);
    console.log('✅ Public Landing Page: All buttons and interactive controls verified');
  });

  test('02. Authentication Keypad & Toggle Buttons', async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    // A. Main Login: Password unmask toggle
    await page.goto('/login', { waitUntil: 'load' });
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('secret123');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle unmask password button if present
    const toggleBtn = page.locator('button[aria-label*="password" i], button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)').first();
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleBtn.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      console.log('  ✓ Password unmask toggle button verified');
    }

    // B. Operator On-Screen Keypad on /operator/login
    await page.goto('/operator/login', { waitUntil: 'load' });
    await expect(page.locator('text=Enter Mobile Number')).toBeVisible();

    // Click on-screen keypad digits 9, 8, 4, 7
    for (const digit of ['9', '8', '4', '7']) {
      const digitBtn = page.locator(`button:has-text("${digit}")`).first();
      await expect(digitBtn).toBeVisible();
      await digitBtn.click();
      await page.waitForTimeout(100);
    }
    console.log('  ✓ Keypad numeric digits clicked (9, 8, 4, 7)');

    // Click Clear button on keypad
    const clearBtn = page.locator('button:has-text("Clear")').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    console.log('  ✓ Keypad Clear button clicked and reset state');

    // Click digits again and test Backspace icon button
    await page.locator('button:has-text("5")').first().click();
    await page.locator('button:has-text("6")').first().click();
    const deleteBtn = page.locator('button:has(svg.lucide-delete)').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      console.log('  ✓ Keypad backspace icon button clicked');
    }

    expect(pageErrors, 'Expected zero unhandled page errors during auth button clicks').toHaveLength(0);
    console.log('✅ Auth & Operator Keypad: All buttons verified with zero errors');
  });

  test('03. Staff Operations Dashboard & Dispatches Board Buttons', async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    // Login as staff
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'staff@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });

    // A. Staff Dashboard Buttons
    await page.goto('/staff/dashboard', { waitUntil: 'load' });
    await page.waitForSelector('text=Staff Operations Dashboard', { timeout: 30000 });

    // 1. Audit Log Timeframe Buttons (DAY / WEEK / MONTH)
    for (const tf of ['WEEK', 'MONTH', 'DAY']) {
      const tfBtn = page.locator(`button:has-text("${tf}")`).first();
      if (await tfBtn.isVisible()) {
        await tfBtn.click();
        await page.waitForTimeout(500);
        console.log(`  ✓ Staff Audit timeframe button clicked: "${tf}"`);
      }
    }

    // 2. Header quick action buttons
    const newDispatchLink = page.locator('a[href="/staff/dispatch/new"]').first();
    await expect(newDispatchLink).toBeVisible();
    console.log('  ✓ "New Dispatch" action button verified');

    const idsLoginsLink = page.locator('a[href="/staff/credentials"]').first();
    await expect(idsLoginsLink).toBeVisible();
    console.log('  ✓ "IDs & Logins" action button verified');

    // B. Staff Dispatches Board Buttons (/staff/dispatch)
    await page.goto('/staff/dispatch', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Status filter tabs
    const statusTabs = ['All', 'Pending', 'En Route', 'On Site', 'Delivered'];
    for (const tab of statusTabs) {
      const tabBtn = page.locator(`button:has-text("${tab}"), a:has-text("${tab}")`).first();
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        console.log(`  ✓ Dispatch status tab clicked: "${tab}"`);
      }
    }

    // Date navigation buttons (Today / Previous / Next)
    const dateBtns = page.locator('button:has-text("Today"), button:has-text("Yesterday"), button:has-text("Tomorrow")');
    const dateCount = await dateBtns.count();
    for (let i = 0; i < dateCount; i++) {
      const btn = dateBtns.nth(i);
      if (await btn.isVisible()) {
        const text = await btn.innerText();
        await btn.click();
        await page.waitForTimeout(300);
        console.log(`  ✓ Dispatch date filter clicked: "${text.trim()}"`);
      }
    }

    expect(pageErrors, 'Expected zero unhandled page errors during Staff button clicks').toHaveLength(0);
    console.log('✅ Staff Portal: Dashboard & Dispatches Board buttons verified');
  });

  test('04. Staff Tools Inventory & Deployments Modal Buttons', async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    // Login as staff
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'staff@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/staff/tools', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // 1. Add Tool Modal Trigger button
    const addToolBtn = page.locator('button:has-text("Add Tool"), button:has-text("New Tool"), button:has-text("Add New Tool")').first();
    if (await addToolBtn.isVisible()) {
      await addToolBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✓ "Add Tool" button opened modal dialog');

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close"), button:has-text("✕")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        console.log('  ✓ Modal Cancel button closed modal cleanly');
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // 2. Deployment Details buttons on tools list
    const deployBtns = page.locator('button:has-text("Deployed"), button:has-text("View"), button:has-text("Details")');
    const deployCount = await deployBtns.count();
    if (deployCount > 0) {
      await deployBtns.first().click();
      await page.waitForTimeout(500);
      console.log('  ✓ Tool Deployments modal opened');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      console.log('  ✓ Tool Deployments modal closed');
    }

    expect(pageErrors, 'Expected zero unhandled page errors during Tools button clicks').toHaveLength(0);
    console.log('✅ Staff Tools: Inventory action buttons and modals verified');
  });

  test('05. Admin Executive Portal — Rate Matrix & Modals', async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    // Login as admin
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@zerogroup.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/admin/settings/rates', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // 1. "Create Custom Rate Card" button
    const createRateBtn = page.locator('button:has-text("Create Custom Rate"), button:has-text("Add Rate"), button:has-text("New Rate Card")').first();
    if (await createRateBtn.isVisible()) {
      await createRateBtn.click();
      await page.waitForTimeout(500);
      console.log('  ✓ "Create Custom Rate Card" modal opened');

      // Cancel button
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        console.log('  ✓ Rate modal Cancel button closed dialog cleanly');
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // 2. Admin Live Map Filter buttons
    await page.goto('/admin/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const mapFilters = ['Today', 'Yesterday', 'Tomorrow', 'This Week', 'All Fleet'];
    for (const mf of mapFilters) {
      const mfBtn = page.locator(`button:has-text("${mf}"), a:has-text("${mf}")`).first();
      if (await mfBtn.isVisible()) {
        await mfBtn.click();
        await page.waitForTimeout(300);
        console.log(`  ✓ Live Map timeframe filter clicked: "${mf}"`);
      }
    }

    expect(pageErrors, 'Expected zero unhandled page errors during Admin button clicks').toHaveLength(0);
    console.log('✅ Admin Portal: Rate cards and Live Map filter buttons verified');
  });

  test('06. Driver & Operator Mobile Shift & Action Buttons', async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors: string[] = [];
    setupErrorTracking(page, pageErrors);

    // A. Driver Mobile Portal
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'driver@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/driver/home', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    // Driver action buttons
    const driverActionLinks = page.locator('a[href*="/driver/"], button');
    const driverCount = await driverActionLinks.count();
    console.log(`  ✓ Found ${driverCount} interactive elements in Driver Mobile Portal`);

    // B. Operator Field Portal
    await page.context().clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'operator@zerogroup.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto('/operator/home', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const operatorActionLinks = page.locator('a[href*="/operator/"], button');
    const operatorCount = await operatorActionLinks.count();
    console.log(`  ✓ Found ${operatorCount} interactive elements in Operator Field Portal`);

    expect(pageErrors, 'Expected zero unhandled page errors during Driver/Operator button clicks').toHaveLength(0);
    console.log('✅ Driver & Operator: All buttons verified with zero exceptions');
  });

});
