import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.test configuration for Playwright
const testEnv = dotenv.config({ path: path.resolve(__dirname, '.env.test') }).parsed || {};
const dbUrl = testEnv.DATABASE_URL || process.env.DATABASE_URL || '';

// Parse database name from URL without printing credentials
const cleanUrl = dbUrl.split('?')[0];
const dbName = cleanUrl.split('/').pop() || '';

console.log(`[Playwright Startup] Target Database: "${dbName}"`);

if (!dbName.endsWith('_test')) {
  throw new Error(
    `[Playwright Startup FATAL] Playwright must run strictly against a database ending in "_test"! Detected database name: "${dbName}". Execution aborted.`
  );
}

process.env.DATABASE_URL = dbUrl;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: 'list',
  
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome', 
      },
    },
  ],

  // Run dev server pointing strictly at .env.test before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      ...testEnv,
      PORT: '3000',
    },
  },
});

