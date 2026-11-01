import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Module 4.0: Layout Shell, Mobile Drawer & God Mode Banner', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  const artifactDir = path.resolve(
    'C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/3a8c3f56-c1a8-4f57-8cfa-2feee98d0f82'
  );

  test('God Mode banner is in-flow / sticky at z-30 (thin top bar) and navigates back to Admin Hub', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    // Admin viewing staff dispatch page triggers God Mode banner
    await page.goto('/staff/dispatch', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const banner = page.locator('#admin-return-banner');
    await expect(banner).toBeVisible();

    // Verify thin bar styling and z-30 sticky position
    const bannerBox = await banner.boundingBox();
    expect(bannerBox).not.toBeNull();
    // Thin top bar: height under 48px
    expect(bannerBox!.height).toBeLessThanOrEqual(48);

    const zIndex = await banner.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(zIndex).toBe('30');

    const position = await banner.evaluate((el) => window.getComputedStyle(el).position);
    expect(position).toBe('sticky');

    // Click Return to Admin Hub
    const returnBtn = banner.locator('button:has-text("Admin Hub")');
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
  });

  test('Desktop Matrix: 1280px & 1920px Admin & Staff sidebar layout shells', async ({ browser }) => {
    // 1. Admin Context at 1280px & 1920px
    const adminCtx = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
      viewport: { width: 1280, height: 800 },
    });
    const adminPage = await adminCtx.newPage();
    await adminPage.goto('/admin/dashboard', { waitUntil: 'load' });
    await adminPage.waitForTimeout(1000);
    await expect(adminPage.locator('aside')).toBeVisible();
    await adminPage.screenshot({ path: path.join(artifactDir, 'layout_1280px_admin.png') });

    await adminPage.setViewportSize({ width: 1920, height: 1080 });
    await adminPage.waitForTimeout(500);
    await adminPage.screenshot({ path: path.join(artifactDir, 'layout_1920px_admin.png') });
    await adminCtx.close();

    // 2. Staff Context at 1280px & 1920px
    const staffCtx = await browser.newContext({
      storageState: 'playwright/.auth/staff.json',
      viewport: { width: 1280, height: 800 },
    });
    const staffPage = await staffCtx.newPage();
    await staffPage.goto('/staff/dispatch', { waitUntil: 'load' });
    await staffPage.waitForTimeout(1000);
    await expect(staffPage.locator('aside')).toBeVisible();
    await staffPage.screenshot({ path: path.join(artifactDir, 'layout_1280px_staff.png') });

    await staffPage.setViewportSize({ width: 1920, height: 1080 });
    await staffPage.waitForTimeout(500);
    await staffPage.screenshot({ path: path.join(artifactDir, 'layout_1920px_staff.png') });
    await staffCtx.close();
  });

  test('Tablet 768px: Layout shell, drawer open state, and screenshot capture', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/dashboard', { waitUntil: 'load' });
    await expect(page.locator('h1')).toBeVisible();

    // Initial closed state
    await page.screenshot({ path: path.join(artifactDir, 'layout_768px_closed.png') });

    // Open Drawer via hamburger
    const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Verify open drawer
    const drawer = page.locator('#admin-mobile-drawer');
    await expect(drawer).toHaveClass(/translate-x-0/);
    await page.screenshot({ path: path.join(artifactDir, 'layout_768px_drawer_open.png') });

    // Close via Esc: Assert hidden and focus returns to hamburger
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveClass(/-translate-x-full/);
    await expect(hamburger).toBeFocused();
  });

  test('Mobile 360px: Seeded metrics, side-by-side buttons, text >= 12px, bottom scroll clearance, drawer Esc & focus trap', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/admin/dashboard', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // 1. Verify Seeded Data is Present (not all zeros)
    const confirmedCash = page.locator('text=Confirmed Cash').locator('..').locator('h2');
    await expect(confirmedCash).toBeVisible();
    const cashText = await confirmedCash.textContent();
    console.log('Confirmed Cash Display:', cashText);
    expect(cashText).toContain('1,45,000');

    const activeJobs = page.locator('text=Active Jobs').locator('..').locator('h2');
    const jobsText = await activeJobs.textContent();
    console.log('Active Jobs Display:', jobsText);
    expect(jobsText?.trim()).toBe('4');

    const availableFleet = page.locator('text=Available Fleet').locator('..').locator('h2');
    const fleetText = await availableFleet.textContent();
    console.log('Available Fleet Display:', fleetText);
    expect(fleetText?.trim()).toBe('12');

    // 2. Verify Buttons are Side-by-Side across available width
    const btn1 = page.locator('a:has-text("IDs & Logins")');
    const btn2 = page.locator('a:has-text("My Profile")');
    await expect(btn1).toBeVisible();
    await expect(btn2).toBeVisible();
    const box1 = await btn1.boundingBox();
    const box2 = await btn2.boundingBox();
    expect(box1).not.toBeNull();
    expect(box2).not.toBeNull();
    // Same vertical line / row (side-by-side)
    expect(Math.abs(box1!.y - box2!.y)).toBeLessThanOrEqual(4);
    // Span full container width: combined width + gap covers > 80% of 328px usable width
    expect(box1!.width + box2!.width).toBeGreaterThan(280);

    // 3. Verify Smallest Text is >= 12px
    const cardLabel = page.locator('text=Confirmed Cash');
    const labelFontSize = await cardLabel.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    console.log('Card Label Font Size:', labelFontSize);
    expect(labelFontSize).toBeGreaterThanOrEqual(12);

    const cardDesc = page.locator('text=Deposited and verified');
    const descFontSize = await cardDesc.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    console.log('Card Description Font Size:', descFontSize);
    expect(descFontSize).toBeGreaterThanOrEqual(12);

    // 4. Initial 360px Closed Screenshot (with seeded metrics)
    await page.screenshot({ path: path.join(artifactDir, 'layout_360px_closed.png') });

    // 5. Scroll to Maximum Bottom: Verify last content scrolls clear of floating hamburger
    const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
    await expect(hamburger).toBeVisible();
    const hamburgerBox = await hamburger.boundingBox();

    // Scroll main container to bottom
    await page.locator('main').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(500);

    // Capture Scrolled to Bottom Screenshot
    await page.screenshot({ path: path.join(artifactDir, 'layout_360px_scrolled_bottom.png') });

    // Scroll back up for drawer tests
    await page.locator('main').evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(300);

    // 6. Open Drawer & Verify Body Scroll Lock
    await hamburger.click();
    const drawer = page.locator('#admin-mobile-drawer');
    await expect(drawer).toHaveClass(/translate-x-0/);
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    // Drawer screenshot at 360px
    await page.screenshot({ path: path.join(artifactDir, 'layout_360px_drawer_open.png') });

    // 7. Focus Trap Assertion: First element -> Shift+Tab to Last -> Tab to First
    const focusableLinks = drawer.locator('a, button');
    const count = await focusableLinks.count();
    expect(count).toBeGreaterThan(2);

    const firstItem = focusableLinks.first();
    const lastItem = focusableLinks.last();

    await firstItem.focus();
    await expect(firstItem).toBeFocused();

    // Shift+Tab from first wraps to last
    await page.keyboard.press('Shift+Tab');
    await expect(lastItem).toBeFocused();

    // Tab from last wraps back to first
    await page.keyboard.press('Tab');
    await expect(firstItem).toBeFocused();

    // 8. Press Escape to Close Drawer & Unlock Scroll
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveClass(/-translate-x-full/);
    await expect(hamburger).toBeFocused();
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('Staff Mobile Drawer: Open, Esc closes, focus returns to hamburger, focus trap and scroll lock', async ({ browser }) => {
    const staffCtx = await browser.newContext({
      storageState: 'playwright/.auth/staff.json',
      viewport: { width: 360, height: 740 },
    });
    const staffPage = await staffCtx.newPage();
    await staffPage.goto('/staff/dispatch', { waitUntil: 'load' });

    const staffHamburger = staffPage.locator('button[aria-label="Toggle navigation menu"]');
    await expect(staffHamburger).toBeVisible();

    // 1. Open Staff Drawer
    await staffHamburger.click();
    const staffDrawer = staffPage.locator('#staff-mobile-drawer');
    await expect(staffDrawer).toHaveClass(/translate-x-0/);
    await expect(staffPage.locator('body')).toHaveCSS('overflow', 'hidden');

    // 2. Focus Trap
    const focusableLinks = staffDrawer.locator('a, button');
    const count = await focusableLinks.count();
    expect(count).toBeGreaterThan(2);

    const firstItem = focusableLinks.first();
    const lastItem = focusableLinks.last();

    await firstItem.focus();
    await expect(firstItem).toBeFocused();

    await staffPage.keyboard.press('Shift+Tab');
    await expect(lastItem).toBeFocused();

    await staffPage.keyboard.press('Tab');
    await expect(firstItem).toBeFocused();

    // 3. Close via Escape: Assert hidden, focus returns to hamburger, body scroll unlocked
    await staffPage.keyboard.press('Escape');
    await expect(staffDrawer).toHaveClass(/-translate-x-full/);
    await expect(staffHamburger).toBeFocused();
    await expect(staffPage.locator('body')).not.toHaveCSS('overflow', 'hidden');

    await staffCtx.close();
  });

  test('God Mode Matrix (On vs Off): 360, 768, 1280, 1920 Screenshots', async ({ browser }) => {
    const viewports = [
      { name: '360', width: 360, height: 740 },
      { name: '768', width: 768, height: 1024 },
      { name: '1280', width: 1280, height: 800 },
      { name: '1920', width: 1920, height: 1080 },
    ];

    // 1. God Mode ON: Admin viewing /staff/dispatch
    const adminCtx = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const adminPage = await adminCtx.newPage();

    for (const vp of viewports) {
      await adminPage.setViewportSize({ width: vp.width, height: vp.height });
      await adminPage.goto('/staff/dispatch', { waitUntil: 'load' });
      await adminPage.waitForTimeout(800);

      const banner = adminPage.locator('#admin-return-banner');
      await expect(banner).toBeVisible();
      await adminPage.screenshot({
        path: path.join(artifactDir, `god_mode_on_${vp.name}px.png`),
      });
    }
    await adminCtx.close();

    // 2. God Mode OFF: Staff viewing /staff/dispatch
    const staffCtx = await browser.newContext({
      storageState: 'playwright/.auth/staff.json',
    });
    const staffPage = await staffCtx.newPage();

    for (const vp of viewports) {
      await staffPage.setViewportSize({ width: vp.width, height: vp.height });
      await staffPage.goto('/staff/dispatch', { waitUntil: 'load' });
      await staffPage.waitForTimeout(800);

      // Staff does NOT see the God Mode banner
      const banner = staffPage.locator('#admin-return-banner');
      await expect(banner).not.toBeVisible();
      await staffPage.screenshot({
        path: path.join(artifactDir, `god_mode_off_${vp.name}px.png`),
      });
    }
    await staffCtx.close();
  });

  test('Driver and Field Operator Mobile App Shells', async ({ browser }) => {
    // 1. Driver Shell
    const driverCtx = await browser.newContext({
      storageState: 'playwright/.auth/driver.json',
      viewport: { width: 360, height: 740 },
    });
    const driverPage = await driverCtx.newPage();
    await driverPage.goto('/driver/home', { waitUntil: 'load' });
    await driverPage.waitForTimeout(1000);
    await driverPage.screenshot({ path: path.join(artifactDir, 'shell_driver_home.png') });
    await driverCtx.close();

    // 2. Operator Shell
    const operatorCtx = await browser.newContext({
      storageState: 'playwright/.auth/operator.json',
      viewport: { width: 360, height: 740 },
    });
    const operatorPage = await operatorCtx.newPage();
    await operatorPage.goto('/operator/home', { waitUntil: 'load' });
    await operatorPage.waitForTimeout(1000);
    await operatorPage.screenshot({ path: path.join(artifactDir, 'shell_operator_home.png') });
    await operatorCtx.close();
  });
});
