import AxeBuilder from '@axe-core/playwright';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function resetDemo(request: APIRequestContext) {
  await request.post('/api/v1/auth/demo', { data: { as: 'student' } });
  const r = await request.post('/api/v1/me/demo-controls', { data: { reset: true } });
  expect(r.ok()).toBeTruthy();
}

export async function demo(page: Page, as: 'student' | 'admin' = 'student') {
  const r = await page.request.post('/api/v1/auth/demo', { data: { as } });
  expect(r.ok()).toBeTruthy();
}

/** WCAG 2.1 AA scan. Fails on serious and critical issues. */
export async function axe(page: Page, label: string) {
  // Let entrance animations (up to 700ms) finish so contrast is measured on the settled screen.
  await page.waitForTimeout(1500);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe').analyze();
  const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${label}: ${v.id} ${v.help} (${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')})`)).toEqual([]);
}

export async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}
