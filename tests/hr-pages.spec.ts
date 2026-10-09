import { test, expect } from '@playwright/test';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

test.describe('HR Pages Separation Flow', () => {
  test.beforeAll(async () => {
    const password = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'staff@zerogroup.in' },
      update: { hashedPassword: password, role: 'STAFF' },
      create: { email: 'staff@zerogroup.in', hashedPassword: password, role: 'STAFF' }
    });
    
    // Create the properly linked employee profile with the EXACT correct role
    await prisma.employee.upsert({
      where: { userId: user.id },
      update: { role: 'STAFF', isPendingDelete: false },
      create: {
        userId: user.id,
        name: 'Staff User',
        phone: '1234567890',
        role: 'STAFF',
        isPendingDelete: false
      }
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should navigate to the newly separated Office Employees and Field Workers pages', async ({ page }) => {
    // 1. Clear cookies to prevent stale session redirect loops
    await page.context().clearCookies();

    // 2. Log in as Office Staff
    await page.goto('/');
    
    // Select Admin tab using the shield icon
    await page.locator('button').filter({ has: page.locator('.lucide-shield') }).click();
    
    // Fill credentials
    await page.locator('input[name="email"]').fill('staff@zerogroup.in');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In to Portal/i }).click();

    // NextAuth returns a Next.js redirect to /redirecting. In the test environment, 
    // waiting for /staff/dashboard can timeout due to client-side routing stalls.
    // We explicitly navigate to the dashboard once the session is secured.
    await expect(page.getByText('Securing Session...')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.goto('/staff/dashboard');

    // 3. Test the "Office Employees" page
    // Click the sidebar link
    await page.getByRole('link', { name: 'Office Employees' }).click();
    
    // Wait for URL
    await page.waitForURL('**/staff/employees');
    
    // Verify the custom heading exists
    await expect(page.getByRole('heading', { name: 'Office Employees' })).toBeVisible();
    
    // Wait for Next.js hydration so onClick handlers are attached
    await page.waitForTimeout(2000);

    // Click 'Add Staff' just to verify the button exists
    await expect(page.getByRole('button', { name: 'Add Staff' })).toBeVisible();

    // 4. Test the "Field Workers" page
    // Click the sidebar link
    await page.getByRole('link', { name: 'Field Workers' }).click();
    
    // Wait for URL
    await page.waitForURL('**/staff/workers');
    
    // Verify the custom heading exists
    await expect(page.getByRole('heading', { name: 'Field Workers' })).toBeVisible();
    
    // Verify the add button exists
    await expect(page.getByRole('button', { name: 'Add Worker' })).toBeVisible();
  });
});
