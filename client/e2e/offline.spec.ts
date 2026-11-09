import { expect, test } from '@playwright/test';
import { axe, demo, resetDemo } from './helpers';

// Section 12 acceptance test. Runs against the production build with its service worker:
//   npm run build -w client && npx vite preview (port 4173), then PREVIEW_URL=http://localhost:4173 npm run e2e
const PREVIEW = process.env.PREVIEW_URL;
test.skip(!PREVIEW, 'Set PREVIEW_URL to the production preview to run the offline acceptance test');
test.use({ baseURL: PREVIEW });

test.beforeEach(async ({ request, page }) => {
  await resetDemo(request);
  await demo(page);
  await page.goto('/app');
  // Wait for the service worker to install and control the page, then load the offline screens once.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  for (const path of ['/app/transit', '/app/essentials', '/app/journey']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
});

test('offline: transit routes DXB Terminal 1 to campus and Essentials still opens', async ({ page, context }) => {
  await context.setOffline(true);
  // A full reload with no network: everything must come from the service worker and IndexedDB.
  await page.goto('/app/essentials');
  await expect(page.getByText('Mobile SIM')).toBeVisible();
  await page.goto('/app/transit');
  await page.getByTestId('preset-airport').click();
  await expect(page.getByRole('list', { name: 'Route steps' })).toContainText('Airport Terminal 1 to Dubai Internet City');
  await expect(page.getByText(/You're offline/).first()).toBeVisible();
  await axe(page, 'transit offline');
  await context.setOffline(false);
});

test('offline tick queues and syncs when back online', async ({ page, context }) => {
  await expect(page.getByRole('img', { name: /Journey 0% charged/ })).toBeVisible();
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await page.getByRole('checkbox', { name: /Plan your first month budget/ }).click();
  await expect(page.getByText(/syncs when you're back online/)).toBeVisible();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('Your changes are synced')).toBeVisible({ timeout: 10_000 });
  const j = await (await page.request.get('/api/v1/journey')).json();
  expect(j.tasks.find((t: { key: string }) => t.key === 'plan-budget').status).toBe('done');
});

