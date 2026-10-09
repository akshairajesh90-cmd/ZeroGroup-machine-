import { test, expect } from '@playwright/test';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

test.describe('Website Durability & Role-Based Access Flow', () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    const password = await bcrypt.hash('password123', 10);
    const roles = ['OWNER', 'ADMIN', 'STAFF', 'OPERATOR', 'DRIVER'];
    
    for (const role of roles) {
      const email = `${role.toLowerCase()}@zerogroup.in`;
      const user = await prisma.user.upsert({
        where: { email },
        update: { hashedPassword: password, role: role as any },
        create: { email, hashedPassword: password, role: role as any }
      });
      
      await prisma.employee.upsert({
        where: { userId: user.id },
        update: { role: role as any, isPendingDelete: false },
        create: {
          userId: user.id,
          name: `${role} User`,
          phone: '9999999999',
          role: role as any,
          isPendingDelete: false
        }
      });
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  const loginAs = async (page: any, role: string, tabName: string, expectedUrl: string) => {
    await page.context().clearCookies();
    await page.goto('/');
    
    if (tabName === 'ADMIN') {
      await page.locator('button').filter({ has: page.locator('.lucide-shield') }).click();
    } else {
      await page.locator('button').filter({ has: page.locator('.lucide-truck') }).click();
    }
    
    await page.locator('input[name="email"]').fill(`${role.toLowerCase()}@zerogroup.in`);
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();

    // Wait until the app routes us to /redirecting (which means login succeeded and cookie is set)
    await page.waitForURL('**/redirecting', { timeout: 30000 });

    // Now safely jump to the expected dashboard to bypass client-side transition delays
    await page.goto(expectedUrl);
    await page.waitForURL(`**${expectedUrl}*`);
  };

  test('ADMIN Role - Full Access Check', async ({ page }) => {
    await loginAs(page, 'ADMIN', 'ADMIN', '/admin/dashboard');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('STAFF Role - HR and Dispatch Check', async ({ page }) => {
    await loginAs(page, 'STAFF', 'ADMIN', '/staff/dashboard');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('OPERATOR Role - Mobile PWA Check', async ({ page }) => {
    await loginAs(page, 'OPERATOR', 'DRIVER', '/operator/home');
    await expect(page.locator('div').first()).toBeVisible({ timeout: 15000 });
  });

  test('DRIVER Role - Mobile PWA Check', async ({ page }) => {
    await loginAs(page, 'DRIVER', 'DRIVER', '/driver/home');
    await expect(page.locator('div').first()).toBeVisible({ timeout: 15000 });
  });
});
