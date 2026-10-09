/**
 * Dedicated Playwright config for the Full Simulation.
 * Uses existing auth state — no setup dependency.
 * Runs with its own timeout and worker count.
 */
import { defineConfig, devices } from '@playwright/test';
require('dotenv').config();

export default defineConfig({
  testDir: '.',
  testMatch: ['testing/full_simulation/**/*.spec.ts'],
  timeout: 90000,
  expect: { timeout: 20000 },
  fullyParallel: false,    // Run scenes sequentially for clearer output
  retries: 0,
  workers: 1,              // One browser at a time for real-life simulation clarity
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'testing/simulation-report' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'sim-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'simulation',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['sim-setup'],
    },
  ],
  // Reuse existing dev server — do NOT restart it
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
