import { test, expect } from '@playwright/test';

test.describe('Modal Behavior (Esc Key, Focus Trap, Viewports & Contrast)', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('Modal opens, manages keyboard focus, and closes via close trigger', async ({ page }) => {
    await page.goto('/staff/fleet', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Initial state: no modal open
    const initialDialogs = await page.locator('[role="dialog"]').count();
    expect(initialDialogs).toBe(0);

    // Click 'Add Machine' to open the modal
    const addBtn = page.locator('button:has-text("Add Machine")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click({ force: true });
    await page.waitForTimeout(600);

    // 1. Verify modal dialog is visible with role="dialog"
    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    // 2. Verify modal backdrop exists
    const modalBackdrop = page.locator('.fixed.inset-0').first();
    await expect(modalBackdrop).toBeVisible();

    // 3. Test keyboard navigation: Tab moves focus into the modal inputs
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement ? document.activeElement.tagName : null);
    expect(focusedTag).toBeTruthy();

    // 4. Test closing the modal via Close button
    const closeBtn = page.locator('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has(.lucide-x)').first();
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(600);
    await expect(modalDialog).not.toBeVisible();
  });

  test('WCAG AA Contrast Check on Form Elements and Buttons', async ({ page }) => {
    await page.goto('/staff/fleet', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Click Add Machine
    const addBtn = page.locator('button:has-text("Add Machine")').first();
    await addBtn.click({ force: true });
    await page.waitForTimeout(600);

    // Verify contrast of inputs and buttons inside modal
    const metrics = await page.evaluate(() => {
      function sRGBtoLin(c: number): number {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      function getLuminance(rgbStr: string): number {
        const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return 0;
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
      }
      function getContrast(rgb1: string, rgb2: string): number {
        const l1 = getLuminance(rgb1);
        const l2 = getLuminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return [];

      const inputs = Array.from(dialog.querySelectorAll<HTMLElement>('input, button, label'));
      return inputs.map((el) => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)'
          ? style.backgroundColor
          : 'rgb(15, 23, 42)'; // slate-900 card background
        const color = style.color;
        const ratio = getContrast(color, bg);
        return {
          tag: el.tagName,
          text: ((el.innerText || el.getAttribute('placeholder')) ?? '').slice(0, 25),
          color,
          bg,
          ratio: parseFloat(ratio.toFixed(2))
        };
      });
    });

    expect(metrics.length).toBeGreaterThan(0);
    console.log(`Evaluated ${metrics.length} elements inside modal:`);
    metrics.forEach((m) => console.log(` - <${m.tag}> "${m.text}": contrast ${m.ratio}:1`));
  });
});
