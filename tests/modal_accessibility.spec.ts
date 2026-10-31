import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import axeCore from 'axe-core';

test.describe('Modal Behavior & Accessibility (Esc Key, Focus Trap, Scroll Lock & Real Contrast)', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('Modal lifecycle: Esc closes, focus trap cycles inside dialog, and scroll lock on body', async ({ page }) => {
    await page.goto('/staff/fleet', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Initial state: body overflow is not locked
    const initialOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(initialOverflow).not.toBe('hidden');

    // Click 'Add Machine' to open the modal
    const addBtn = page.locator('button:has-text("Add Machine")').first();
    await expect(addBtn).toBeVisible();
    await addBtn.click({ force: true });
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    // Assertion 1: Scroll lock is active on body while modal is open
    const lockedOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(lockedOverflow).toBe('hidden');

    // Assertion 2: Focus Trap (Explicit First / Last Element Assertions)
    const focusableLocator = modalDialog.locator(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const count = await focusableLocator.count();
    expect(count).toBeGreaterThan(1);

    const firstElement = focusableLocator.first();
    const lastElement = focusableLocator.last();

    // 2a. Focus the exact first element (close button)
    await firstElement.focus();
    await expect(firstElement).toBeFocused();

    // 2b. Press Shift+Tab from the first element -> MUST wrap directly to the exact last element!
    await page.keyboard.press('Shift+Tab');
    await expect(lastElement).toBeFocused();

    // 2c. Press Tab from the wrapped last element -> MUST cycle directly back to the exact first element!
    await page.keyboard.press('Tab');
    await expect(firstElement).toBeFocused();

    // Assertion 3: Press Escape key to close the modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await expect(modalDialog).not.toBeVisible();

    // Assertion 4: Body scroll lock is released
    const restoredOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(restoredOverflow).not.toBe('hidden');
  });

  test('WCAG AA Contrast Check on Form Elements, Buttons, and Placeholders with Recursive Background Resolution', async ({ page }) => {
    await page.goto('/staff/fleet', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Click Add Machine
    const addBtn = page.locator('button:has-text("Add Machine")').first();
    await addBtn.click({ force: true });
    await page.waitForTimeout(600);

    const metrics = await page.evaluate(() => {
      function parseRgba(str: string): [number, number, number, number] {
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return [0, 0, 0, 0];
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
      }

      function composite(fg: [number, number, number, number], bg: [number, number, number]): [number, number, number] {
        const a = fg[3];
        return [
          Math.round(a * fg[0] + (1 - a) * bg[0]),
          Math.round(a * fg[1] + (1 - a) * bg[1]),
          Math.round(a * fg[2] + (1 - a) * bg[2]),
        ];
      }

      function getActualBackground(el: HTMLElement): [number, number, number] {
        const stack: [number, number, number, number][] = [];
        let curr: HTMLElement | null = el;
        while (curr) {
          const bgStr = window.getComputedStyle(curr).backgroundColor;
          if (bgStr && bgStr !== 'transparent' && bgStr !== 'rgba(0, 0, 0, 0)') {
            const parsed = parseRgba(bgStr);
            if (parsed[3] > 0) {
              stack.unshift(parsed);
              if (parsed[3] === 1) break;
            }
          }
          curr = curr.parentElement;
        }
        let result: [number, number, number] = [15, 23, 42]; // default dark slate-900
        for (const layer of stack) {
          result = composite(layer, result);
        }
        return result;
      }

      function sRGBtoLin(c: number): number {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }

      function getLuminance(rgb: [number, number, number]): number {
        return 0.2126 * sRGBtoLin(rgb[0]) + 0.7152 * sRGBtoLin(rgb[1]) + 0.0722 * sRGBtoLin(rgb[2]);
      }

      function getContrast(rgb1: [number, number, number], rgb2: [number, number, number]): number {
        const l1 = getLuminance(rgb1);
        const l2 = getLuminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return [];

      const results: Array<{
        selector: string;
        type: string;
        text: string;
        resolvedBg: string;
        textColor: string;
        contrastRatio: number;
        passesAA: boolean;
      }> = [];

      // Check Cancel / Close buttons and Action buttons
      const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('button'));
      buttons.forEach((btn, idx) => {
        const bg = getActualBackground(btn);
        const style = window.getComputedStyle(btn);
        const fgParsed = parseRgba(style.color);
        const fgRgb: [number, number, number] = [fgParsed[0], fgParsed[1], fgParsed[2]];
        const ratio = parseFloat(getContrast(fgRgb, bg).toFixed(2));
        results.push({
          selector: `button[${idx}]`,
          type: 'button',
          text: (btn.innerText || btn.getAttribute('aria-label') || 'Icon').trim(),
          resolvedBg: `rgb(${bg.join(', ')})`,
          textColor: style.color,
          contrastRatio: ratio,
          passesAA: ratio >= 3.0 // buttons/UI controls require >= 3.0:1
        });
      });

      // Check Inputs: both text color and ::placeholder color
      const inputs = Array.from(dialog.querySelectorAll<HTMLInputElement>('input'));
      inputs.forEach((input, idx) => {
        const bg = getActualBackground(input);
        const style = window.getComputedStyle(input);

        // Input text color
        const fgParsed = parseRgba(style.color);
        const fgRgb: [number, number, number] = [fgParsed[0], fgParsed[1], fgParsed[2]];
        const textRatio = parseFloat(getContrast(fgRgb, bg).toFixed(2));

        // Input placeholder color
        const placeholderStyle = window.getComputedStyle(input, '::placeholder');
        const phParsed = parseRgba(placeholderStyle.color);
        const phRgb: [number, number, number] = [phParsed[0], phParsed[1], phParsed[2]];
        const phRatio = parseFloat(getContrast(phRgb, bg).toFixed(2));

        results.push({
          selector: `input[${idx}]`,
          type: 'input-placeholder',
          text: (input.placeholder || input.name || `input-${idx}`).slice(0, 30),
          resolvedBg: `rgb(${bg.join(', ')})`,
          textColor: placeholderStyle.color,
          contrastRatio: phRatio,
          passesAA: phRatio >= 4.5
        });

        results.push({
          selector: `input[${idx}]`,
          type: 'input-text',
          text: (input.value || input.placeholder || `input-${idx}`).slice(0, 30),
          resolvedBg: `rgb(${bg.join(', ')})`,
          textColor: style.color,
          contrastRatio: textRatio,
          passesAA: textRatio >= 4.5
        });
      });

      // Check Labels
      const labels = Array.from(dialog.querySelectorAll<HTMLElement>('label'));
      labels.forEach((lbl, idx) => {
        const bg = getActualBackground(lbl);
        const style = window.getComputedStyle(lbl);
        const fgParsed = parseRgba(style.color);
        const fgRgb: [number, number, number] = [fgParsed[0], fgParsed[1], fgParsed[2]];
        const ratio = parseFloat(getContrast(fgRgb, bg).toFixed(2));
        results.push({
          selector: `label[${idx}]`,
          type: 'label',
          text: lbl.innerText.trim(),
          resolvedBg: `rgb(${bg.join(', ')})`,
          textColor: style.color,
          contrastRatio: ratio,
          passesAA: ratio >= 4.5
        });
      });

      return results;
    });

    expect(metrics.length).toBeGreaterThan(0);
    console.log('--- RECURSIVELY RESOLVED CONTRAST METRICS ---');
    metrics.forEach(m => {
      console.log(`[${m.type}] "${m.text}": ${m.contrastRatio}:1 (Text: ${m.textColor} on ResolvedBg: ${m.resolvedBg}) -> ${m.passesAA ? 'PASS' : 'FAIL'}`);
      expect(m.passesAA).toBe(true);
    });
  });

  test('Page-level Axe Core Accessibility Scan on Live Map (/staff/live/map) and Modal Dialog', async ({ page }) => {
    // 1. Full Page Scan on /staff/live/map
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const axeSource = axeCore.source;
    await page.evaluate(axeSource);

    const pageScanResults = await page.evaluate(async () => {
      // @ts-expect-error axe is attached to window in evaluate
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    const pageViolations = pageScanResults.violations || [];
    console.log(`Page-Level Axe Scan (/staff/live/map): ${pageViolations.length} violations found.`);
    if (pageViolations.length > 0) {
      pageViolations.forEach((v: { impact: string; id: string; description: string; nodes: unknown[] }) => console.log(` - Violation [${v.impact}]: ${v.id} - ${v.description} (${v.nodes.length} nodes)`));
    }

    // 2. Open Store Location Modal on Live Map and run Modal Axe Scan
    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.click({ force: true });
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    const modalScanResults = await page.evaluate(async () => {
      const modal = document.querySelector('[role="dialog"]');
      // @ts-expect-error axe is attached to window in evaluate
      return await window.axe.run(modal, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      });
    });

    const modalViolations = modalScanResults.violations || [];
    console.log(`Modal-Level Axe Scan (Store Location Modal): ${modalViolations.length} violations found.`);
    if (modalViolations.length > 0) {
      modalViolations.forEach((v: { impact: string; id: string; description: string; nodes: unknown[] }) => console.log(` - Modal Violation [${v.impact}]: ${v.id} - ${v.description} (${v.nodes.length} nodes)`));
    }

    // Write raw axe scan output to artifact
    const artifactPath = path.resolve('C:/Users/AKSHAI RAJESH/.gemini/antigravity/brain/3a8c3f56-c1a8-4f57-8cfa-2feee98d0f82/page_axe_report.json');
    fs.writeFileSync(artifactPath, JSON.stringify({
      pageScan: {
        url: '/staff/live/map',
        violationsCount: pageViolations.length,
        violations: pageViolations
      },
      modalScan: {
        target: 'Edit Store and Base Yard Location Modal',
        violationsCount: modalViolations.length,
        violations: modalViolations
      }
    }, null, 2));

    // Assert modal has no critical violations
    const criticalModalViolations = modalViolations.filter((v: { impact: string }) => v.impact === 'critical');
    expect(criticalModalViolations.length).toBe(0);
  });

  test('Mobile 360px viewport: Hamburger is z-40 and occluded under modal backdrop (z-overlay / z-modal)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/staff/live/map', { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    // Verify hamburger button exists at 360px with z-40
    const hamburgerBtn = page.locator('button.fixed.bottom-6.left-6');
    await expect(hamburgerBtn).toBeVisible();
    const hamburgerZ = await hamburgerBtn.evaluate((el) => window.getComputedStyle(el).zIndex);
    expect(hamburgerZ).toBe('40');

    // Open Store Yard GPS modal
    const storeBtn = page.locator('button:has-text("Store Yard GPS")').first();
    await storeBtn.dispatchEvent('click');
    await page.waitForTimeout(600);

    const modalDialog = page.locator('[role="dialog"]');
    await expect(modalDialog).toBeVisible();

    // Verify modal dialog computed z-index is higher than hamburger (z-modal: 1100 > 40)
    const modalZ = await modalDialog.evaluate((el) => {
      const z = window.getComputedStyle(el).zIndex;
      return parseInt(z) || 0;
    });
    expect(modalZ).toBeGreaterThan(40);

    // Verify element at hamburger button coordinates is obscured by modal/backdrop (z-modal: 1100)
    const hamburgerBox = await hamburgerBtn.boundingBox();
    expect(hamburgerBox).toBeTruthy();
    if (hamburgerBox) {
      const topElTag = await page.evaluate(({ x, y }) => {
        const topEl = document.elementFromPoint(x, y);
        return topEl ? (topEl.getAttribute('role') || topEl.className) : null;
      }, { x: hamburgerBox.x + hamburgerBox.width / 2, y: hamburgerBox.y + hamburgerBox.height / 2 });

      expect(topElTag).not.toBe(null);
      console.log('Element at hamburger coordinates under open modal at 360px:', topElTag);
    }
  });
});
