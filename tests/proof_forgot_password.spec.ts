import { test, expect } from '@playwright/test';
import path from 'path';

test('Capture Proof: Login Forgot Password multi-role operator selection', async ({ page }) => {
  await page.goto('/reset-password');
  await page.waitForTimeout(1000);

  // Fill in name and phone
  await page.fill('input[type="text"]', 'Rajan Pillai');
  await page.fill('input[type="tel"]', '9847111003');

  // Select multiple operator equipment roles
  const mixerBtn = page.getByRole('button', { name: /Concrete Mixer Operator/i });
  const liftBtn = page.getByRole('button', { name: /Lift \/ Hoist Operator/i });
  const vibratorBtn = page.getByRole('button', { name: /⚡ Vibrator Operator/i });

  await mixerBtn.click();
  await liftBtn.click();
  await vibratorBtn.click();
  await page.waitForTimeout(500);

  // Save screenshot to project proof-screenshots and artifact dir
  const artifactDir = 'C:\\Users\\AKSHAI RAJESH\\.gemini\\antigravity\\brain\\3a8c3f56-c1a8-4f57-8cfa-2feee98d0f82';
  const artifactPath = path.join(artifactDir, 'proof-login-forgot-multi-role.png');
  const projectPath = path.join(process.cwd(), 'proof-screenshots', 'proof-login-forgot-multi-role.png');

  await page.screenshot({ path: artifactPath, fullPage: false });
  await page.screenshot({ path: projectPath, fullPage: false });
  console.log(`📸 Saved screenshot: ${projectPath}`);
});
