import { defineConfig } from '@playwright/test';

// Runs against the dev servers (npm run dev). Set BASE_URL to test a deployed build.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } }],
});
