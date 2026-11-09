import { expect, test } from '@playwright/test';
import { axe, demo, noOverflow, resetDemo } from './helpers';

test.beforeEach(async ({ request }) => resetDemo(request));

test('onboarding to home for a new student', async ({ page }) => {
  await page.goto('/app/welcome');
  await axe(page, 'welcome');
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.getByLabel('First name').fill('Omar');
  await page.getByLabel('Email').fill(`omar${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('longenough1');
  await page.getByRole('button', { name: 'Create account' }).click();
  // During a slide transition the outgoing step is still in the DOM, so act on the incoming (last) one.
  const step = async (name: string, next: RegExp) => {
    await page.getByRole('button', { name }).last().click();
    await expect(page).toHaveURL(next);
    await page.waitForTimeout(700);
  };
  await expect(page).toHaveURL(/setup\/university/);
  await page.waitForTimeout(700);
  await page.getByText('Heriot-Watt University Dubai').last().click();
  await step('Continue', /setup\/arrival/);
  await step('Continue', /setup\/country/);
  await page.getByLabel('Where are you coming from?').last().selectOption('Pakistan');
  await step('Continue', /setup\/housing/);
  await page.getByText('I need a place').last().click();
  await step('Continue', /setup\/eid/);
  await step('See my journey', /\/app$/);
  await expect(page.getByRole('heading', { name: 'Hi Omar' })).toBeVisible();
  await expect(page.getByText('days to go')).toBeVisible();
});

test('demo student sees 12 days to go, one next step and locked Emirates ID tasks', async ({ page }) => {
  await demo(page);
  await page.goto('/app');
  await expect(page.getByText('12 days to go')).toBeVisible();
  await expect(page.getByTestId('next-step')).toHaveCount(1);
  await noOverflow(page);
  await axe(page, 'home');
  await page.goto('/app/journey');
  await page.getByRole('tab', { name: 'Settle' }).click();
  await expect(page.getByText('Unlocks with your Emirates ID').first()).toBeVisible();
  await expect(page.getByText('Meanwhile: Use your Silver nol card')).toBeVisible();
  await axe(page, 'journey');
});

test('marking a task done charges the battery', async ({ page }) => {
  await demo(page);
  await page.goto('/app/journey');
  await expect(page.getByRole('img', { name: /Journey 0% charged/ })).toBeVisible();
  await page.getByRole('checkbox', { name: /Choose a verified place to live/ }).click();
  await expect(page.getByRole('img', { name: /Journey [1-9]\d*% charged/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Done/ })).toBeVisible();
});

test('opens a listing and shows Ask for price while pending', async ({ page }) => {
  await demo(page);
  await page.goto('/app/housing');
  await axe(page, 'housing');
  await page.getByTestId('listing-card').first().click();
  await expect(page).toHaveURL(/\/app\/housing\/[a-f0-9]{24}/);
  await expect(page.getByText('See the contract before you pay a deposit.')).toBeVisible();
  await noOverflow(page);
  await axe(page, 'listing detail');
});

test('budget share link opens the family view without login', async ({ page, browser }) => {
  await demo(page);
  await page.goto('/app/budget');
  await expect(page.getByText(/Rates on/)).toBeVisible();
  await axe(page, 'budget');
  await page.getByTestId('share-family').click();
  await page.getByRole('button', { name: 'Create link' }).click();
  const url = await page.getByTestId('share-url').textContent();
  expect(url).toMatch(/\/share\/[A-Za-z0-9_-]{43}$/);
  const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await anon.newPage();
  await p2.goto(new URL(url!).pathname);
  await expect(p2.getByRole('heading', { name: "Aanya's first month in Dubai" })).toBeVisible();
  await axe(p2, 'family view');
  await anon.close();
});

test('admin verifies a listing and the student sees the badge after one refresh', async ({ page, browser }) => {
  // Reset listings to pending through a fresh admin context
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const ap = await admin.newPage();
  await ap.request.post('/api/v1/auth/demo', { data: { as: 'admin' } });
  const list = await (await ap.request.get('/api/v1/admin/listings')).json();
  for (const l of list.listings) await ap.request.patch(`/api/v1/admin/listings/${l.id}/verification`, { data: { status: 'pending' } });
  await ap.goto('/admin/listings');
  await axe(ap, 'admin listings');
  const target = list.listings[0];
  await ap.getByTestId(`verify-${target.id}`).click();
  await ap.getByLabel('AED a month').first().fill('3250');
  await ap.getByLabel('Deposit AED').first().fill('1500');
  if (await ap.getByLabel('AED a month').nth(1).count()) {
    await ap.getByLabel('AED a month').nth(1).fill('4100');
    await ap.getByLabel('Deposit AED').nth(1).fill('1500');
  }
  await ap.getByLabel('Source link').fill('https://example.org/price-list-2026');
  await ap.getByLabel('Nearest station').selectOption('metro-dubai-internet-city');
  await ap.getByLabel('Walk, minutes').fill('8');
  await ap.getByTestId('verify-submit').click();
  await expect(ap.getByText(/is verified/)).toBeVisible();

  await demo(page);
  await page.goto('/app/housing');
  const card = page.getByTestId('listing-card').first();
  await expect(card).toContainText('Verified by Heriot-Watt University Dubai');
  await expect(card).toContainText('AED 3,250 a month');
  await expect(card).toContainText('About 8 min walk to Dubai Internet City');
  await expect(card).toContainText('₹');
  await admin.close();
});

test('Emirates ID received unlocks tasks with one calm toast', async ({ page }) => {
  await demo(page);
  await page.request.post('/api/v1/me/demo-controls', { data: { arrivalOffsetDays: 0, eidStatus: 'residence_issued' } });
  await page.goto('/app/me');
  await page.getByRole('button', { name: 'Emirates ID received' }).click();
  await expect(page.getByText(/Emirates ID received\. \d+ tasks? (is|are) ready\./)).toBeVisible();
  await axe(page, 'me');
});

test('landing page tells the story and links to the app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Feel at home');
  await expect(page.getByText('42,026 students now study in Dubai.')).toBeVisible();
  await noOverflow(page);
  await page.getByText('Make every arrival', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await axe(page, 'landing');
  await page.goto('/this-does-not-exist');
  await expect(page.getByText('This page took a wrong turn')).toBeVisible();
});
