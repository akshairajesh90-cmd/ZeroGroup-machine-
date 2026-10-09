import { test, expect } from '@playwright/test';

const testUsers = [
  { role: 'Admin / Owner', email: 'owner@zerogroup.in', tab: 'ADMIN' },
  { role: 'Office Staff', email: 'staff@zerogroup.in', tab: 'ADMIN' },
  { role: 'Field Operator', email: 'operator@zerogroup.in', tab: 'DRIVER' }
];

test.describe('Antigravity Project - Multi-User Login Flow', () => {
  for (const user of testUsers) {
    test(`should authenticate as ${user.role}`, async ({ page }) => {
      // 1. Navigate to the application
      await page.goto('/');

      // 2. Verify the page title
      await expect(page).toHaveTitle(/ZERO GROUP/);

      // 3. Select the correct portal tab (Admin vs Driver)
      if (user.tab === 'DRIVER') {
        const driverTab = page.getByRole('button', { name: /Field Crew/i, exact: false }).or(page.locator('button').filter({ hasText: 'DRIVER' }));
        // Just clicking the second button in the tab group (the Truck icon one)
        // Let's use a simpler locator based on the component structure seen earlier
        await page.locator('button').filter({ has: page.locator('.lucide-truck') }).click();
      } else {
        await page.locator('button').filter({ has: page.locator('.lucide-shield') }).click();
      }

      // 4. Fill in credentials
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
      await emailInput.fill(user.email);

      const passwordInput = page.locator('input[name="password"]');
      await expect(passwordInput).toBeVisible();
      await passwordInput.fill('password123');

      // 5. Submit the form
      const signInButton = page.getByRole('button', { name: /Sign In to Portal/i });
      await expect(signInButton).toBeVisible();
      await signInButton.click();

      // 6. Verify submission state
      await expect(page.getByText('Securing Session...')).toBeVisible();
    });
  }
});
